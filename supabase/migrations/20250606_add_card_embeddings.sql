-- カード埋め込みベクターテーブル
CREATE TABLE card_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES board_cards(id) ON DELETE CASCADE,
  embedding TEXT NOT NULL, -- JSON形式の埋め込みベクター
  text_content TEXT NOT NULL, -- 埋め込み生成時のテキスト
  model_version VARCHAR(50) DEFAULT 'text-embedding-3-small',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(card_id) -- 1つのカードにつき1つの埋め込み
);

-- 関係性提案テーブル
CREATE TABLE relationship_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_card_id UUID NOT NULL REFERENCES board_cards(id) ON DELETE CASCADE,
  target_card_id UUID NOT NULL REFERENCES board_cards(id) ON DELETE CASCADE,
  relationship_type VARCHAR(20) NOT NULL CHECK (relationship_type IN ('semantic', 'topical', 'conceptual')),
  similarity FLOAT NOT NULL CHECK (similarity >= 0 AND similarity <= 1),
  confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  explanation TEXT NOT NULL,
  suggested_strength FLOAT NOT NULL CHECK (suggested_strength >= 0 AND suggested_strength <= 1),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'auto_applied')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(source_card_id, target_card_id) -- 同じペアの重複防止
);

-- インデックス作成
CREATE INDEX idx_card_embeddings_card_id ON card_embeddings(card_id);
CREATE INDEX idx_card_embeddings_updated ON card_embeddings(last_updated);
CREATE INDEX idx_relationship_suggestions_source ON relationship_suggestions(source_card_id);
CREATE INDEX idx_relationship_suggestions_status ON relationship_suggestions(status);
CREATE INDEX idx_relationship_suggestions_confidence ON relationship_suggestions(confidence DESC);

-- RLS (Row Level Security) 設定
ALTER TABLE card_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_suggestions ENABLE ROW LEVEL SECURITY;

-- カード埋め込みベクターのRLSポリシー
CREATE POLICY "Users can view card embeddings for their boards" 
ON card_embeddings FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM board_cards bc
    JOIN boards b ON bc.board_id = b.id
    JOIN nest_boards nb ON b.id = nb.board_id
    JOIN nests n ON nb.nest_id = n.id
    WHERE bc.id = card_embeddings.card_id
    AND n.created_by = auth.uid()
  )
);

CREATE POLICY "Users can manage card embeddings for their boards" 
ON card_embeddings FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM board_cards bc
    JOIN boards b ON bc.board_id = b.id
    JOIN nest_boards nb ON b.id = nb.board_id
    JOIN nests n ON nb.nest_id = n.id
    WHERE bc.id = card_embeddings.card_id
    AND n.created_by = auth.uid()
  )
);

-- 関係性提案のRLSポリシー  
CREATE POLICY "Users can view relationship suggestions for their boards"
ON relationship_suggestions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM board_cards bc
    JOIN boards b ON bc.board_id = b.id
    JOIN nest_boards nb ON b.id = nb.board_id
    JOIN nests n ON nb.nest_id = n.id
    WHERE bc.id = relationship_suggestions.source_card_id
    AND n.created_by = auth.uid()
  )
);

CREATE POLICY "Users can manage relationship suggestions for their boards"
ON relationship_suggestions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM board_cards bc
    JOIN boards b ON bc.board_id = b.id
    JOIN nest_boards nb ON b.id = nb.board_id
    JOIN nests n ON nb.nest_id = n.id
    WHERE bc.id = relationship_suggestions.source_card_id
    AND n.created_by = auth.uid()
  )
);

-- 自動更新関数（埋め込みの更新日時管理）
CREATE OR REPLACE FUNCTION update_embedding_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_card_embeddings_timestamp
  BEFORE UPDATE ON card_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_embedding_timestamp(); 