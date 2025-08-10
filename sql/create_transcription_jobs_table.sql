-- 文字起こしジョブ管理テーブル
CREATE TABLE IF NOT EXISTS transcription_jobs (
  id SERIAL PRIMARY KEY,
  job_id VARCHAR(255) UNIQUE NOT NULL,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  gcs_file_name VARCHAR(500) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  transcript TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_meeting_id ON transcription_jobs(meeting_id);
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_status ON transcription_jobs(status);
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_created_at ON transcription_jobs(created_at);

-- 更新日時を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_transcription_jobs_updated_at 
  BEFORE UPDATE ON transcription_jobs 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- RLSポリシー設定
ALTER TABLE transcription_jobs ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のミーティングのジョブのみ閲覧可能
CREATE POLICY "Users can view their own transcription jobs" ON transcription_jobs
  FOR SELECT USING (
    meeting_id IN (
      SELECT id FROM meetings 
      WHERE nest_id IN (
        SELECT nest_id FROM nest_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- ユーザーは自分のミーティングのジョブのみ作成可能
CREATE POLICY "Users can create transcription jobs for their meetings" ON transcription_jobs
  FOR INSERT WITH CHECK (
    meeting_id IN (
      SELECT id FROM meetings 
      WHERE nest_id IN (
        SELECT nest_id FROM nest_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- サービスロールは全操作可能
CREATE POLICY "Service role can manage all transcription jobs" ON transcription_jobs
  FOR ALL USING (auth.role() = 'service_role');
