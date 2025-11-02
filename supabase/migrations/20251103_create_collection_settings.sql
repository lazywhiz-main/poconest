-- データ収集設定テーブル
CREATE TABLE trend_collection_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nest_id UUID NOT NULL REFERENCES nests(id) ON DELETE CASCADE,
  
  -- RSSフィード設定
  rss_feeds JSONB DEFAULT '[]',
  -- [
  --   {
  --     "id": "uuid",
  --     "url": "https://www.dezeen.com/feed/",
  --     "name": "Dezeen",
  --     "enabled": true,
  --     "language": "en",
  --     "category": "デザインメディア",
  --     "last_collected": "2025-11-02T10:00:00Z",
  --     "products_count": 45
  --   }
  -- ]
  
  -- ブランドウォッチ設定
  brand_watches JSONB DEFAULT '[]',
  -- [
  --   {
  --     "id": "uuid",
  --     "name": "Nendo",
  --     "keywords": ["Nendo", "佐藤オオキ"],
  --     "official_url": "https://nendo.jp",
  --     "official_rss": "https://nendo.jp/feed",
  --     "category": "デザイナー",
  --     "enabled": true,
  --     "search_methods": ["rss", "google"],
  --     "frequency": "weekly",
  --     "last_checked": "2025-11-02T10:00:00Z",
  --     "products_count": 5
  --   }
  -- ]
  
  -- 重複検出設定
  duplicate_detection JSONB DEFAULT '{"enabled": true, "url_check": true, "title_similarity_threshold": 0.85}',
  
  -- 最小スコア閾値
  min_score_threshold INTEGER DEFAULT 20,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(nest_id)
);

-- 重複検出用フィンガープリントテーブル
CREATE TABLE trend_product_fingerprints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nest_id UUID NOT NULL REFERENCES nests(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES trend_products(id) ON DELETE CASCADE,
  url_hash TEXT NOT NULL,
  title_normalized TEXT NOT NULL, -- 正規化されたタイトル（類似度計算用）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(nest_id, url_hash)
);

-- インデックス
CREATE INDEX idx_fingerprints_nest_id ON trend_product_fingerprints(nest_id);
CREATE INDEX idx_fingerprints_title ON trend_product_fingerprints(nest_id, title_normalized);

-- RLS有効化
ALTER TABLE trend_collection_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_product_fingerprints ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: trend_collection_settings
CREATE POLICY "Users can read their own collection settings"
  ON trend_collection_settings FOR SELECT
  USING (auth.uid() IN (SELECT owner_id FROM nests WHERE id = nest_id));

CREATE POLICY "Users can insert their own collection settings"
  ON trend_collection_settings FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT owner_id FROM nests WHERE id = nest_id));

CREATE POLICY "Users can update their own collection settings"
  ON trend_collection_settings FOR UPDATE
  USING (auth.uid() IN (SELECT owner_id FROM nests WHERE id = nest_id));

CREATE POLICY "Users can delete their own collection settings"
  ON trend_collection_settings FOR DELETE
  USING (auth.uid() IN (SELECT owner_id FROM nests WHERE id = nest_id));

-- RLSポリシー: trend_product_fingerprints
CREATE POLICY "Users can read their own fingerprints"
  ON trend_product_fingerprints FOR SELECT
  USING (auth.uid() IN (SELECT owner_id FROM nests WHERE id = nest_id));

CREATE POLICY "Allow service role full access to fingerprints"
  ON trend_product_fingerprints FOR ALL
  USING (true);

-- デフォルト設定を挿入する関数
CREATE OR REPLACE FUNCTION create_default_collection_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO trend_collection_settings (nest_id, rss_feeds)
  VALUES (
    NEW.id,
    '[
      {
        "id": "' || gen_random_uuid() || '",
        "url": "https://www.dezeen.com/feed/",
        "name": "Dezeen",
        "enabled": true,
        "language": "en",
        "category": "デザインメディア",
        "last_collected": null,
        "products_count": 0
      }
    ]'::jsonb
  )
  ON CONFLICT (nest_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nest作成時にデフォルト設定を自動作成
CREATE TRIGGER trigger_create_default_collection_settings
  AFTER INSERT ON nests
  FOR EACH ROW
  EXECUTE FUNCTION create_default_collection_settings();

