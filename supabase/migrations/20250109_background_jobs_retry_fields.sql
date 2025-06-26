-- バックグラウンドジョブシステム リトライ・タイムアウト機能追加
-- 実行日: 2025-01-09

-- 1. background_jobsテーブルに新しいフィールドを追加
ALTER TABLE background_jobs 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0 CHECK (retry_count >= 0),
ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3 CHECK (max_retries >= 0),
ADD COLUMN IF NOT EXISTS timeout_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMP WITH TIME ZONE;

-- 2. 新しいインデックスを追加
CREATE INDEX IF NOT EXISTS idx_background_jobs_retry_status ON background_jobs(status, retry_count, timeout_at);
CREATE INDEX IF NOT EXISTS idx_background_jobs_timeout ON background_jobs(timeout_at) WHERE timeout_at IS NOT NULL;

-- 3. タイムアウトしたジョブを自動的に失敗状態にする関数
CREATE OR REPLACE FUNCTION handle_job_timeouts()
RETURNS void AS $$
BEGIN
    UPDATE background_jobs 
    SET 
        status = 'failed',
        error_message = 'ジョブがタイムアウトしました',
        updated_at = NOW()
    WHERE 
        status IN ('running', 'pending') 
        AND timeout_at IS NOT NULL 
        AND timeout_at < NOW();
        
    -- ログ出力
    GET DIAGNOSTICS 
        FOUND = ROW_COUNT;
    
    IF FOUND > 0 THEN
        RAISE NOTICE 'Marked % jobs as timed out', FOUND;
    END IF;
END;
$$ language 'plpgsql';

-- 4. 定期的なタイムアウト処理（cron-likeな機能が利用可能な場合）
-- 注意: 実際の環境では pg_cron 拡張機能が必要
-- SELECT cron.schedule('job-timeout-check', '*/5 * * * *', 'SELECT handle_job_timeouts();');

-- 5. ビューを更新（リトライ情報を含む）
CREATE OR REPLACE VIEW user_active_jobs AS
SELECT 
    bj.*,
    m.title as meeting_title,
    m.transcript IS NOT NULL as has_transcript,
    CASE 
        WHEN bj.retry_count > 0 THEN 
            CONCAT('リトライ中 (', bj.retry_count, '/', bj.max_retries, ')')
        ELSE bj.status 
    END as display_status
FROM background_jobs bj
LEFT JOIN meetings m ON bj.meeting_id = m.id
WHERE bj.status IN ('pending', 'running')
ORDER BY bj.created_at DESC;

-- 6. コメント追加
COMMENT ON COLUMN background_jobs.retry_count IS 'リトライ回数 (0から開始)';
COMMENT ON COLUMN background_jobs.max_retries IS '最大リトライ回数';
COMMENT ON COLUMN background_jobs.timeout_at IS 'タイムアウト予定時刻';
COMMENT ON COLUMN background_jobs.last_error_at IS '最後にエラーが発生した時刻';

-- 7. 既存ジョブにデフォルト値を設定
UPDATE background_jobs 
SET 
    retry_count = 0,
    max_retries = CASE 
        WHEN type = 'ai_summary' THEN 3
        WHEN type = 'card_extraction' THEN 3
        WHEN type = 'transcription' THEN 2
        ELSE 3
    END
WHERE retry_count IS NULL OR max_retries IS NULL; 