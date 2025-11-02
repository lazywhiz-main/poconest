-- Trend Insights 機能用テーブル作成
-- 作成日: 2025-11-02

-- 製品テーブル
CREATE TABLE IF NOT EXISTS trend_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nest_id UUID NOT NULL REFERENCES nests(id) ON DELETE CASCADE,
  
  -- 基本情報
  title_original TEXT NOT NULL,
  title_ja TEXT NOT NULL,
  url TEXT NOT NULL,
  summary_ja TEXT,
  
  -- スコアリング (0-10点)
  score_concept_shift DECIMAL(3,1) DEFAULT 0,
  score_category_disruption DECIMAL(3,1) DEFAULT 0,
  score_philosophical_pricing DECIMAL(3,1) DEFAULT 0,
  score_experience_change DECIMAL(3,1) DEFAULT 0,
  score_total DECIMAL(4,1) GENERATED ALWAYS AS (
    score_concept_shift + 
    score_category_disruption + 
    score_philosophical_pricing + 
    score_experience_change
  ) STORED,
  
  -- メタデータ
  category TEXT,
  brand_designer TEXT,
  price_value TEXT,
  release_date DATE,
  
  -- ステータス管理
  status TEXT DEFAULT '新着' CHECK (status IN ('新着', '調査中(L1)', '調査中(L2)', '調査中(L3)', '完了', '除外')),
  reason_text TEXT,
  
  -- タイムスタンプ
  discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT valid_scores CHECK (
    score_concept_shift >= 0 AND score_concept_shift <= 10 AND
    score_category_disruption >= 0 AND score_category_disruption <= 10 AND
    score_philosophical_pricing >= 0 AND score_philosophical_pricing <= 10 AND
    score_experience_change >= 0 AND score_experience_change <= 10
  )
);

-- インデックス作成
CREATE INDEX idx_trend_products_nest ON trend_products(nest_id);
CREATE INDEX idx_trend_products_status ON trend_products(status);
CREATE INDEX idx_trend_products_score ON trend_products(score_total DESC);
CREATE INDEX idx_trend_products_discovered ON trend_products(discovered_at DESC);

-- 調査テーブル
CREATE TABLE IF NOT EXISTS trend_investigations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES trend_products(id) ON DELETE CASCADE,
  
  level INT NOT NULL CHECK (level IN (1, 2, 3)),
  result_text TEXT NOT NULL,
  
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration_seconds INT,
  
  UNIQUE(product_id, level)
);

CREATE INDEX idx_trend_investigations_product ON trend_investigations(product_id);

-- インサイトテーブル
CREATE TABLE IF NOT EXISTS trend_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nest_id UUID NOT NULL REFERENCES nests(id) ON DELETE CASCADE,
  
  period_type TEXT NOT NULL CHECK (period_type IN ('月次', '四半期', 'カスタム')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  report_content TEXT NOT NULL,
  
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generated_by TEXT DEFAULT 'AI'
);

CREATE INDEX idx_trend_insights_nest ON trend_insights(nest_id);
CREATE INDEX idx_trend_insights_period ON trend_insights(period_start DESC);

-- ユーザーメモテーブル
CREATE TABLE IF NOT EXISTS trend_user_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES trend_products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  note_content TEXT NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_trend_user_notes_product ON trend_user_notes(product_id);
CREATE INDEX idx_trend_user_notes_user ON trend_user_notes(user_id);

-- RLS (Row Level Security) ポリシー設定

-- trend_products: ネストメンバーのみアクセス可能
ALTER TABLE trend_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view trend products in their nests"
  ON trend_products FOR SELECT
  USING (
    nest_id IN (
      SELECT nest_id FROM nest_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert trend products in their nests"
  ON trend_products FOR INSERT
  WITH CHECK (
    nest_id IN (
      SELECT nest_id FROM nest_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update trend products in their nests"
  ON trend_products FOR UPDATE
  USING (
    nest_id IN (
      SELECT nest_id FROM nest_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete trend products in their nests"
  ON trend_products FOR DELETE
  USING (
    nest_id IN (
      SELECT nest_id FROM nest_members WHERE user_id = auth.uid()
    )
  );

-- trend_investigations: 製品にアクセスできるユーザーのみ
ALTER TABLE trend_investigations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view investigations for accessible products"
  ON trend_investigations FOR SELECT
  USING (
    product_id IN (
      SELECT id FROM trend_products WHERE nest_id IN (
        SELECT nest_id FROM nest_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert investigations for accessible products"
  ON trend_investigations FOR INSERT
  WITH CHECK (
    product_id IN (
      SELECT id FROM trend_products WHERE nest_id IN (
        SELECT nest_id FROM nest_members WHERE user_id = auth.uid()
      )
    )
  );

-- trend_insights: ネストメンバーのみアクセス可能
ALTER TABLE trend_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view insights in their nests"
  ON trend_insights FOR SELECT
  USING (
    nest_id IN (
      SELECT nest_id FROM nest_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert insights in their nests"
  ON trend_insights FOR INSERT
  WITH CHECK (
    nest_id IN (
      SELECT nest_id FROM nest_members WHERE user_id = auth.uid()
    )
  );

-- trend_user_notes: 自分のメモのみアクセス可能
ALTER TABLE trend_user_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notes"
  ON trend_user_notes FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own notes"
  ON trend_user_notes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own notes"
  ON trend_user_notes FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notes"
  ON trend_user_notes FOR DELETE
  USING (user_id = auth.uid());

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trend_products_updated_at
  BEFORE UPDATE ON trend_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trend_user_notes_updated_at
  BEFORE UPDATE ON trend_user_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- サンプルデータ投入（開発用）
-- 注意: 実際の nest_id に置き換える必要があります
/*
INSERT INTO trend_products (nest_id, title_original, title_ja, url, summary_ja, 
  score_concept_shift, score_category_disruption, score_philosophical_pricing, score_experience_change,
  category, brand_designer, price_value, status, reason_text)
VALUES 
  (
    'YOUR_NEST_ID_HERE',
    'EP-1320 Medieval Beat Machine',
    'EP-1320 中世ビートマシン',
    'https://example.com/ep1320',
    '世界初の中世電子楽器。ルート、ハーディガーディ、「騒々しい農民」のサンプルを使って中世風の音楽を作成できるビートマシン。楽器という既存カテゴリーに「時代概念」を導入した革新的製品。',
    9.0, 8.0, 6.0, 8.0,
    'Music Instrument', 'Teenage Engineering', '$299', '完了',
    '楽器という既存カテゴリーに「中世」という時代概念を導入。「充電式ナイフ」が「ナイフが充電？」という驚きを与えたように、「中世の電子楽器」というコンセプト自体が概念の転換を示している。'
  );
*/

