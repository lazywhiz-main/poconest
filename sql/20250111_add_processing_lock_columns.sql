-- バックグラウンドジョブ処理競合制御システム - 専用ロックカラム追加
-- 実行日: 2025-01-11
-- 目的: status以外の専用変数による処理競合防止機構の実装

-- 1. background_jobsテーブルに処理ロック専用カラムを追加
ALTER TABLE public.background_jobs 
ADD COLUMN IF NOT EXISTS processing_lock_id UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS processing_lock_acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS processing_lock_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS processing_lock_owner VARCHAR(50) DEFAULT NULL CHECK (
  processing_lock_owner IS NULL OR 
  processing_lock_owner IN ('edge_function', 'background_worker', 'manual')
);

-- 2. 専用インデックス作成（パフォーマンスと制約保証）
-- アクティブなロックの高速検索用
CREATE INDEX IF NOT EXISTS idx_background_jobs_active_lock 
ON public.background_jobs(id, processing_lock_id) 
WHERE processing_lock_id IS NOT NULL;

-- 期限切れロック検索用
CREATE INDEX IF NOT EXISTS idx_background_jobs_lock_expiry 
ON public.background_jobs(processing_lock_expires_at) 
WHERE processing_lock_expires_at IS NOT NULL;

-- ロック所有者別検索用
CREATE INDEX IF NOT EXISTS idx_background_jobs_lock_owner 
ON public.background_jobs(processing_lock_owner, processing_lock_acquired_at) 
WHERE processing_lock_owner IS NOT NULL;

-- 重複ロック防止のユニーク制約（同一ジョブに対する複数ロック防止）
CREATE UNIQUE INDEX IF NOT EXISTS idx_background_jobs_unique_active_lock 
ON public.background_jobs(id) 
WHERE processing_lock_id IS NOT NULL;

-- 3. 期限切れロック自動解放関数
CREATE OR REPLACE FUNCTION cleanup_expired_processing_locks()
RETURNS INTEGER AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  -- 期限切れロックを自動解放
  UPDATE public.background_jobs 
  SET 
    processing_lock_id = NULL,
    processing_lock_acquired_at = NULL,
    processing_lock_expires_at = NULL,
    processing_lock_owner = NULL,
    updated_at = NOW()
  WHERE 
    processing_lock_id IS NOT NULL 
    AND processing_lock_expires_at IS NOT NULL 
    AND processing_lock_expires_at < NOW();
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  -- クリーンアップログ
  IF cleaned_count > 0 THEN
    RAISE NOTICE 'Cleaned up % expired processing locks', cleaned_count;
  END IF;
  
  RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- 4. 安全なロック獲得ヘルパー関数
CREATE OR REPLACE FUNCTION acquire_processing_lock(
  p_job_id UUID,
  p_lock_owner VARCHAR(50),
  p_lock_duration_minutes INTEGER DEFAULT 30
) RETURNS TABLE(
  success BOOLEAN,
  lock_id UUID,
  message TEXT
) AS $$
DECLARE
  v_lock_id UUID;
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_update_count INTEGER;
BEGIN
  -- ロックIDを生成
  v_lock_id := gen_random_uuid();
  v_expires_at := NOW() + (p_lock_duration_minutes || ' minutes')::INTERVAL;
  
  -- アトミックなロック獲得
  UPDATE public.background_jobs 
  SET 
    processing_lock_id = v_lock_id,
    processing_lock_acquired_at = NOW(),
    processing_lock_expires_at = v_expires_at,
    processing_lock_owner = p_lock_owner,
    updated_at = NOW()
  WHERE 
    id = p_job_id 
    AND processing_lock_id IS NULL;  -- ロックされていない場合のみ
  
  GET DIAGNOSTICS v_update_count = ROW_COUNT;
  
  IF v_update_count = 1 THEN
    -- ロック獲得成功
    RETURN QUERY SELECT 
      TRUE as success,
      v_lock_id as lock_id,
      'Processing lock acquired successfully' as message;
  ELSE
    -- ロック獲得失敗
    RETURN QUERY SELECT 
      FALSE as success,
      NULL::UUID as lock_id,
      'Job is already locked by another process' as message;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. 安全なロック解放ヘルパー関数
CREATE OR REPLACE FUNCTION release_processing_lock(
  p_job_id UUID,
  p_lock_id UUID
) RETURNS TABLE(
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_update_count INTEGER;
BEGIN
  -- 自分のロックのみ解放
  UPDATE public.background_jobs 
  SET 
    processing_lock_id = NULL,
    processing_lock_acquired_at = NULL,
    processing_lock_expires_at = NULL,
    processing_lock_owner = NULL,
    updated_at = NOW()
  WHERE 
    id = p_job_id 
    AND processing_lock_id = p_lock_id;  -- 自分のロックのみ
  
  GET DIAGNOSTICS v_update_count = ROW_COUNT;
  
  IF v_update_count = 1 THEN
    -- ロック解放成功
    RETURN QUERY SELECT 
      TRUE as success,
      'Processing lock released successfully' as message;
  ELSE
    -- ロック解放失敗
    RETURN QUERY SELECT 
      FALSE as success,
      'Lock not found or not owned by this process' as message;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. ロック状態確認ビュー
CREATE OR REPLACE VIEW processing_lock_status AS
SELECT 
  bj.id as job_id,
  bj.type as job_type,
  bj.status as job_status,
  bj.processing_lock_id,
  bj.processing_lock_owner,
  bj.processing_lock_acquired_at,
  bj.processing_lock_expires_at,
  CASE 
    WHEN bj.processing_lock_id IS NULL THEN 'unlocked'
    WHEN bj.processing_lock_expires_at < NOW() THEN 'expired'
    ELSE 'locked'
  END as lock_status,
  CASE 
    WHEN bj.processing_lock_expires_at IS NOT NULL THEN
      EXTRACT(EPOCH FROM (bj.processing_lock_expires_at - NOW())) / 60
    ELSE NULL
  END as minutes_until_expiry,
  bj.created_at,
  bj.updated_at
FROM public.background_jobs bj
ORDER BY bj.created_at DESC;

-- 7. 既存ジョブの処理
-- 現在実行中のジョブに期限切れロックを設定しない（安全性優先）
-- 新しいジョブからのみ新しいロック機構を使用

-- 8. コメント追加
COMMENT ON COLUMN public.background_jobs.processing_lock_id IS '処理競合防止用のロックID（排他制御専用）';
COMMENT ON COLUMN public.background_jobs.processing_lock_acquired_at IS 'ロック獲得時刻';
COMMENT ON COLUMN public.background_jobs.processing_lock_expires_at IS 'ロック有効期限（自動解放用）';
COMMENT ON COLUMN public.background_jobs.processing_lock_owner IS 'ロック所有者（edge_function, background_worker, manual）';

COMMENT ON FUNCTION cleanup_expired_processing_locks() IS '期限切れ処理ロックの自動解放';
COMMENT ON FUNCTION acquire_processing_lock(UUID, VARCHAR, INTEGER) IS '安全な処理ロック獲得';
COMMENT ON FUNCTION release_processing_lock(UUID, UUID) IS '安全な処理ロック解放';
COMMENT ON VIEW processing_lock_status IS '処理ロック状態の監視用ビュー';

-- 9. 権限設定（Supabase環境向け）
-- Service roleに関数実行権限を付与
GRANT EXECUTE ON FUNCTION cleanup_expired_processing_locks() TO service_role;
GRANT EXECUTE ON FUNCTION acquire_processing_lock(UUID, VARCHAR, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION release_processing_lock(UUID, UUID) TO service_role;

-- Authenticated userにビュー参照権限を付与
GRANT SELECT ON processing_lock_status TO authenticated;

-- 10. 自動クリーンアップの設定（オプション - cron使用可能な場合）
-- SELECT cron.schedule('cleanup-expired-locks', '*/5 * * * *', 'SELECT cleanup_expired_processing_locks();');

-- マイグレーション完了ログ
DO $$
BEGIN
  RAISE NOTICE 'Processing lock system migration completed successfully';
  RAISE NOTICE 'Added columns: processing_lock_id, processing_lock_acquired_at, processing_lock_expires_at, processing_lock_owner';
  RAISE NOTICE 'Added indexes: idx_background_jobs_active_lock, idx_background_jobs_lock_expiry, idx_background_jobs_lock_owner, idx_background_jobs_unique_active_lock';
  RAISE NOTICE 'Added functions: cleanup_expired_processing_locks, acquire_processing_lock, release_processing_lock';
  RAISE NOTICE 'Added view: processing_lock_status';
END $$;
