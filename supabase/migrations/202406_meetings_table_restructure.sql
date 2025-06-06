-- meetingsテーブル再設計 DDL（あるべき姿）
-- 既存テーブルがあればALTER、なければCREATE TABLEで利用

-- nest_id: ワークスペース単位の管理
-- status: scheduled/completed/extracted/cancelled
-- tags: 検索・フィルタ用
-- deleted_at: 論理削除

ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS nest_id uuid,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS deleted_at timestamp;

-- participants, uploaded_files, tags の型注釈
COMMENT ON COLUMN meetings.participants IS 'Array of {id, name, email, role}';
COMMENT ON COLUMN meetings.uploaded_files IS 'Array of {id, type, url, summary, created_at, updated_at}';
COMMENT ON COLUMN meetings.tags IS 'Array of string';

-- 必要に応じてインデックス追加
CREATE INDEX IF NOT EXISTS idx_meetings_nest_id ON meetings(nest_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_deleted_at ON meetings(deleted_at); 