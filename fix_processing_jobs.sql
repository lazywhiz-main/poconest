-- 処理中のtranscription_jobsを強制的にcompletedに変更
UPDATE transcription_jobs 
SET 
  status = 'completed',
  transcript = '手動完了通知',
  updated_at = now()
WHERE status = 'processing';

-- 結果確認
SELECT job_id, status, meeting_id, created_at, updated_at 
FROM transcription_jobs 
ORDER BY created_at DESC 
LIMIT 10;
