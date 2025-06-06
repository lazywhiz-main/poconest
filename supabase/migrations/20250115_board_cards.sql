-- ボードテーブル（存在しない場合）
CREATE TABLE IF NOT EXISTS boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nest_id UUID NOT NULL REFERENCES nests(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- ボードカラムテーブル
CREATE TABLE IF NOT EXISTS board_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ボードカードテーブル
CREATE TABLE IF NOT EXISTS board_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES board_columns(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL, -- ミーティングから生成されたカードの場合
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('task', 'idea', 'issue', 'decision', 'note')) DEFAULT 'note',
  tags TEXT[] DEFAULT '{}',
  assignee TEXT,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  deadline DATE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_board_cards_board_id ON board_cards(board_id);
CREATE INDEX IF NOT EXISTS idx_board_cards_column_id ON board_cards(column_id);
CREATE INDEX IF NOT EXISTS idx_board_cards_meeting_id ON board_cards(meeting_id);
CREATE INDEX IF NOT EXISTS idx_board_cards_type ON board_cards(type);
CREATE INDEX IF NOT EXISTS idx_board_cards_priority ON board_cards(priority);

-- RLS（Row Level Security）の設定
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_cards ENABLE ROW LEVEL SECURITY;

-- Boards RLS ポリシー
CREATE POLICY "Users can view boards in their nests" ON boards
  FOR SELECT USING (
    nest_id IN (
      SELECT nm.nest_id FROM nest_members nm WHERE nm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create boards in their nests" ON boards
  FOR INSERT WITH CHECK (
    nest_id IN (
      SELECT nm.nest_id FROM nest_members nm WHERE nm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update boards in their nests" ON boards
  FOR UPDATE USING (
    nest_id IN (
      SELECT nm.nest_id FROM nest_members nm WHERE nm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete boards in their nests" ON boards
  FOR DELETE USING (
    nest_id IN (
      SELECT nm.nest_id FROM nest_members nm WHERE nm.user_id = auth.uid()
    )
  );

-- Board Columns RLS ポリシー
CREATE POLICY "Users can view board columns" ON board_columns
  FOR SELECT USING (
    board_id IN (
      SELECT b.id FROM boards b 
      WHERE b.nest_id IN (
        SELECT nm.nest_id FROM nest_members nm WHERE nm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create board columns" ON board_columns
  FOR INSERT WITH CHECK (
    board_id IN (
      SELECT b.id FROM boards b 
      WHERE b.nest_id IN (
        SELECT nm.nest_id FROM nest_members nm WHERE nm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update board columns" ON board_columns
  FOR UPDATE USING (
    board_id IN (
      SELECT b.id FROM boards b 
      WHERE b.nest_id IN (
        SELECT nm.nest_id FROM nest_members nm WHERE nm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete board columns" ON board_columns
  FOR DELETE USING (
    board_id IN (
      SELECT b.id FROM boards b 
      WHERE b.nest_id IN (
        SELECT nm.nest_id FROM nest_members nm WHERE nm.user_id = auth.uid()
      )
    )
  );

-- Board Cards RLS ポリシー
CREATE POLICY "Users can view board cards" ON board_cards
  FOR SELECT USING (
    board_id IN (
      SELECT b.id FROM boards b 
      WHERE b.nest_id IN (
        SELECT nm.nest_id FROM nest_members nm WHERE nm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create board cards" ON board_cards
  FOR INSERT WITH CHECK (
    board_id IN (
      SELECT b.id FROM boards b 
      WHERE b.nest_id IN (
        SELECT nm.nest_id FROM nest_members nm WHERE nm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update board cards" ON board_cards
  FOR UPDATE USING (
    board_id IN (
      SELECT b.id FROM boards b 
      WHERE b.nest_id IN (
        SELECT nm.nest_id FROM nest_members nm WHERE nm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete board cards" ON board_cards
  FOR DELETE USING (
    board_id IN (
      SELECT b.id FROM boards b 
      WHERE b.nest_id IN (
        SELECT nm.nest_id FROM nest_members nm WHERE nm.user_id = auth.uid()
      )
    )
  );

-- 更新時のupdated_atトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON boards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_board_columns_updated_at BEFORE UPDATE ON board_columns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_board_cards_updated_at BEFORE UPDATE ON board_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 