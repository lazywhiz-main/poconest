-- 話者分離ジョブタイプを追加
-- 実行日: 2025-01-18

-- background_jobsのtypeカラムのCHECK制約を更新
ALTER TABLE background_jobs 
DROP CONSTRAINT IF EXISTS background_jobs_type_check;

ALTER TABLE background_jobs 
ADD CONSTRAINT background_jobs_type_check 
CHECK (type IN ('ai_summary', 'card_extraction', 'transcription', 'speaker_diarization'));
