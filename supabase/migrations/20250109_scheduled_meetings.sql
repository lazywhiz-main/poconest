-- ミーティング自動化システム - 予約ミーティングテーブル
-- 実行日: 2025-01-09

-- 1. scheduled_meetings テーブル作成
CREATE TABLE scheduled_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  platform_type VARCHAR(20) NOT NULL CHECK (platform_type IN ('zoom', 'googlemeet', 'teams')),
  meeting_url TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER NOT NULL CHECK (duration > 0), -- minutes
  
  -- 自動化設定
  auto_join BOOLEAN DEFAULT false,
  auto_transcribe BOOLEAN DEFAULT false,
  auto_summarize BOOLEAN DEFAULT false,
  auto_extract_cards BOOLEAN DEFAULT false,
  
  -- 参加者とメタデータ
  participants TEXT[], -- email addresses
  metadata JSONB DEFAULT '{}',
  
  -- 関連データ
  nest_id UUID REFERENCES nests(id) ON DELETE CASCADE,
  created_meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  
  -- ステータス管理
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  
  -- 監査ログ
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約
  CONSTRAINT valid_start_time CHECK (start_time > NOW()),
  CONSTRAINT valid_duration CHECK (duration BETWEEN 5 AND 480) -- 5分〜8時間
);

-- 2. インデックス作成
CREATE INDEX idx_scheduled_meetings_nest_id ON scheduled_meetings(nest_id);
CREATE INDEX idx_scheduled_meetings_start_time ON scheduled_meetings(start_time);
CREATE INDEX idx_scheduled_meetings_status ON scheduled_meetings(status);
CREATE INDEX idx_scheduled_meetings_platform ON scheduled_meetings(platform_type);
CREATE INDEX idx_scheduled_meetings_created_by ON scheduled_meetings(created_by);

-- 複合インデックス (よく使われるクエリ用)
CREATE INDEX idx_scheduled_meetings_nest_status ON scheduled_meetings(nest_id, status);
CREATE INDEX idx_scheduled_meetings_upcoming ON scheduled_meetings(start_time, status) WHERE status = 'scheduled';

-- 3. RLS (Row Level Security) 設定
ALTER TABLE scheduled_meetings ENABLE ROW LEVEL SECURITY;

-- 読み取り権限: nest のメンバー
CREATE POLICY "Users can view scheduled meetings in their nests" ON scheduled_meetings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM nest_members 
      WHERE nest_members.nest_id = scheduled_meetings.nest_id 
      AND nest_members.user_id = auth.uid()
    )
  );

-- 作成権限: nest のメンバー
CREATE POLICY "Users can create scheduled meetings in their nests" ON scheduled_meetings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM nest_members 
      WHERE nest_members.nest_id = scheduled_meetings.nest_id 
      AND nest_members.user_id = auth.uid()
    ) AND created_by = auth.uid()
  );

-- 更新権限: 作成者または nest の管理者
CREATE POLICY "Users can update their scheduled meetings or nest admins can update" ON scheduled_meetings
  FOR UPDATE USING (
    created_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM nest_members 
      WHERE nest_members.nest_id = scheduled_meetings.nest_id 
      AND nest_members.user_id = auth.uid()
      AND nest_members.role = 'admin'
    )
  );

-- 削除権限: 作成者または nest の管理者
CREATE POLICY "Users can delete their scheduled meetings or nest admins can delete" ON scheduled_meetings
  FOR DELETE USING (
    created_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM nest_members 
      WHERE nest_members.nest_id = scheduled_meetings.nest_id 
      AND nest_members.user_id = auth.uid()
      AND nest_members.role = 'admin'
    )
  );

-- 4. updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_scheduled_meetings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scheduled_meetings_updated_at
    BEFORE UPDATE ON scheduled_meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_scheduled_meetings_updated_at();

-- 5. 自動ステータス更新関数 (ミーティング開始時間に基づく)
CREATE OR REPLACE FUNCTION update_scheduled_meeting_status()
RETURNS void AS $$
BEGIN
    -- 開始時間が過ぎたミーティングを 'in_progress' に更新
    UPDATE scheduled_meetings 
    SET status = 'in_progress'
    WHERE status = 'scheduled' 
    AND start_time <= NOW() 
    AND start_time + INTERVAL '1 minute' * duration >= NOW();
    
    -- 終了時間が過ぎたミーティングを 'completed' に更新
    UPDATE scheduled_meetings 
    SET status = 'completed'
    WHERE status = 'in_progress' 
    AND start_time + INTERVAL '1 minute' * duration < NOW();
END;
$$ LANGUAGE plpgsql;

-- 6. ログテーブル (オプション - 自動化ログ追跡用)
CREATE TABLE scheduled_meeting_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_meeting_id UUID REFERENCES scheduled_meetings(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'auto_join', 'auto_transcribe', 'auto_summarize', etc.
  status VARCHAR(20) NOT NULL, -- 'started', 'completed', 'failed'
  message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_scheduled_meeting_logs_meeting_id ON scheduled_meeting_logs(scheduled_meeting_id);
CREATE INDEX idx_scheduled_meeting_logs_action ON scheduled_meeting_logs(action);
CREATE INDEX idx_scheduled_meeting_logs_created_at ON scheduled_meeting_logs(created_at);

-- RLS for logs
ALTER TABLE scheduled_meeting_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view logs for their scheduled meetings" ON scheduled_meeting_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM scheduled_meetings 
      JOIN nest_members ON nest_members.nest_id = scheduled_meetings.nest_id
      WHERE scheduled_meetings.id = scheduled_meeting_logs.scheduled_meeting_id 
      AND nest_members.user_id = auth.uid()
    )
  );

-- システムのみがログを作成・更新可能
CREATE POLICY "Only system can insert logs" ON scheduled_meeting_logs
  FOR INSERT WITH CHECK (false); -- アプリケーション層でのみ作成

CREATE POLICY "Only system can update logs" ON scheduled_meeting_logs
  FOR UPDATE USING (false); -- 更新不可

COMMENT ON TABLE scheduled_meetings IS 'ミーティング自動化システム - 予約されたミーティングの管理';
COMMENT ON TABLE scheduled_meeting_logs IS 'ミーティング自動化システム - 自動化処理のログ追跡'; 