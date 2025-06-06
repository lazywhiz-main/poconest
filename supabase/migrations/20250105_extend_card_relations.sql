-- カード関係性テーブルの拡張
ALTER TABLE board_card_relations 
ADD COLUMN IF NOT EXISTS relationship_type TEXT DEFAULT 'manual' CHECK (relationship_type IN ('manual', 'semantic', 'derived', 'tag_similarity', 'ai')),
ADD COLUMN IF NOT EXISTS strength FLOAT DEFAULT 0.5 CHECK (strength >= 0.0 AND strength <= 1.0),
ADD COLUMN IF NOT EXISTS confidence FLOAT DEFAULT 1.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 関係性分析結果キャッシュテーブル
CREATE TABLE IF NOT EXISTS card_analysis_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES board_cards(id) ON DELETE CASCADE,
  content_hash TEXT NOT NULL, -- コンテンツ変更検知用
  keywords JSONB DEFAULT '[]', -- 抽出キーワード
  topics JSONB DEFAULT '[]', -- トピック分析結果
  summary TEXT, -- 要約
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(card_id, content_hash)
);

-- ネットワーク可視化用のカード位置キャッシュ
CREATE TABLE IF NOT EXISTS card_network_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES board_cards(id) ON DELETE CASCADE,
  x FLOAT NOT NULL DEFAULT 0,
  y FLOAT NOT NULL DEFAULT 0,
  layout_type TEXT NOT NULL DEFAULT 'force_directed', -- 'force_directed', 'circular', 'manual'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(board_id, card_id, layout_type)
);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_board_card_relations_strength ON board_card_relations(strength DESC);
CREATE INDEX IF NOT EXISTS idx_board_card_relations_type ON board_card_relations(relationship_type);
CREATE INDEX IF NOT EXISTS idx_card_analysis_cache_card_id ON card_analysis_cache(card_id);
CREATE INDEX IF NOT EXISTS idx_card_network_positions_board_id ON card_network_positions(board_id);

-- RLS設定
ALTER TABLE card_analysis_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_network_positions ENABLE ROW LEVEL SECURITY;

-- カード分析キャッシュのRLSポリシー
CREATE POLICY "Users can view card analysis in their nests" ON card_analysis_cache
  FOR SELECT USING (
    card_id IN (
      SELECT bc.id FROM board_cards bc
      JOIN boards b ON bc.board_id = b.id
      WHERE b.nest_id IN (
        SELECT nm.nest_id FROM nest_members nm WHERE nm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage card analysis in their nests" ON card_analysis_cache
  FOR ALL USING (
    card_id IN (
      SELECT bc.id FROM board_cards bc
      JOIN boards b ON bc.board_id = b.id
      WHERE b.nest_id IN (
        SELECT nm.nest_id FROM nest_members nm WHERE nm.user_id = auth.uid()
      )
    )
  );

-- ネットワーク位置のRLSポリシー
CREATE POLICY "Users can view network positions in their nests" ON card_network_positions
  FOR SELECT USING (
    board_id IN (
      SELECT b.id FROM boards b
      WHERE b.nest_id IN (
        SELECT nm.nest_id FROM nest_members nm WHERE nm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage network positions in their nests" ON card_network_positions
  FOR ALL USING (
    board_id IN (
      SELECT b.id FROM boards b
      WHERE b.nest_id IN (
        SELECT nm.nest_id FROM nest_members nm WHERE nm.user_id = auth.uid()
      )
    )
  );

-- updated_atトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_board_card_relations_updated_at 
  BEFORE UPDATE ON board_card_relations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_card_network_positions_updated_at 
  BEFORE UPDATE ON card_network_positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 