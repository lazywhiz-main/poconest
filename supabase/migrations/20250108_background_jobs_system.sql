-- バックグラウンドジョブシステム用テーブル作成
-- 実行日: 2025-01-08

-- 1. バックグラウンドジョブテーブル
CREATE TABLE IF NOT EXISTS background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL CHECK (type IN ('ai_summary', 'card_extraction', 'transcription')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  result JSONB,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  estimated_completion TIMESTAMP WITH TIME ZONE
);

-- 2. インデックス作成
CREATE INDEX IF NOT EXISTS idx_background_jobs_user_status ON background_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_background_jobs_meeting ON background_jobs(meeting_id);
CREATE INDEX IF NOT EXISTS idx_background_jobs_type_status ON background_jobs(type, status);
CREATE INDEX IF NOT EXISTS idx_background_jobs_created_at ON background_jobs(created_at DESC);

-- 3. 自動更新トリガー関数
CREATE OR REPLACE FUNCTION update_background_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. トリガー作成
DROP TRIGGER IF EXISTS update_background_jobs_updated_at_trigger ON background_jobs;
CREATE TRIGGER update_background_jobs_updated_at_trigger
    BEFORE UPDATE ON background_jobs
    FOR EACH ROW EXECUTE FUNCTION update_background_jobs_updated_at();

-- 5. Row Level Security (RLS) 設定
ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;

-- 6. RLSポリシー作成
-- ユーザーは自分のジョブのみ閲覧可能
CREATE POLICY "Users can view own background jobs" ON background_jobs
    FOR SELECT USING (auth.uid() = user_id);

-- ユーザーは自分のジョブのみ作成可能
CREATE POLICY "Users can create own background jobs" ON background_jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分のジョブのみ更新可能
CREATE POLICY "Users can update own background jobs" ON background_jobs
    FOR UPDATE USING (auth.uid() = user_id);

-- サービス（システム）は全てのジョブを管理可能
CREATE POLICY "Service can manage all background jobs" ON background_jobs
    FOR ALL USING (true);

-- 7. ジョブステータス履歴テーブル（オプション - 詳細ログが必要な場合）
CREATE TABLE IF NOT EXISTS background_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES background_jobs(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  progress INTEGER DEFAULT 0,
  message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ログテーブル用インデックス
CREATE INDEX IF NOT EXISTS idx_background_job_logs_job_id ON background_job_logs(job_id, created_at DESC);

-- ログテーブル用RLS
ALTER TABLE background_job_logs ENABLE ROW LEVEL SECURITY;

-- ログのRLSポリシー
CREATE POLICY "Users can view own job logs" ON background_job_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM background_jobs 
            WHERE background_jobs.id = background_job_logs.job_id 
            AND background_jobs.user_id = auth.uid()
        )
    );

-- 8. 便利なビュー作成
CREATE OR REPLACE VIEW user_active_jobs AS
SELECT 
    bj.*,
    m.title as meeting_title,
    m.transcript IS NOT NULL as has_transcript
FROM background_jobs bj
LEFT JOIN meetings m ON bj.meeting_id = m.id
WHERE bj.status IN ('pending', 'running')
ORDER BY bj.created_at DESC;

-- 9. ジョブクリーンアップ関数（古いジョブの自動削除）
CREATE OR REPLACE FUNCTION cleanup_old_background_jobs()
RETURNS void AS $$
BEGIN
    -- 30日以上前の完了/失敗ジョブを削除
    DELETE FROM background_jobs 
    WHERE status IN ('completed', 'failed', 'cancelled')
    AND created_at < NOW() - INTERVAL '30 days';
    
    -- 7日以上前のログを削除
    DELETE FROM background_job_logs 
    WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ language 'plpgsql';

-- 10. コメント追加
COMMENT ON TABLE background_jobs IS 'バックグラウンドで実行される非同期ジョブの管理テーブル';
COMMENT ON COLUMN background_jobs.type IS 'ジョブタイプ: ai_summary, card_extraction, transcription';
COMMENT ON COLUMN background_jobs.status IS 'ジョブステータス: pending, running, completed, failed, cancelled';
COMMENT ON COLUMN background_jobs.progress IS '進捗率 (0-100%)';
COMMENT ON COLUMN background_jobs.result IS 'ジョブ実行結果のJSONデータ';
COMMENT ON COLUMN background_jobs.metadata IS 'ジョブ固有の設定やメタデータ';

COMMENT ON TABLE background_job_logs IS 'バックグラウンドジョブの詳細ログテーブル';
COMMENT ON VIEW user_active_jobs IS '実行中のジョブ一覧表示用ビュー'; 