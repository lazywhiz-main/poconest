-- トレンド製品テーブルにサムネイルURL列を追加
ALTER TABLE trend_products ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

COMMENT ON COLUMN trend_products.thumbnail_url IS '製品のサムネイル画像URL（Open Graph画像またはプレースホルダー）';

-- パターン検出用のビュー: ブランド/デザイナー分析
CREATE OR REPLACE VIEW trend_brand_analysis AS
SELECT 
  nest_id,
  brand_designer,
  COUNT(*) as product_count,
  AVG(score_total) as avg_score,
  MAX(score_total) as max_score,
  MIN(score_total) as min_score,
  AVG(score_concept_shift) as avg_concept_shift,
  AVG(score_category_disruption) as avg_category_disruption,
  AVG(score_philosophical_pricing) as avg_philosophical_pricing,
  AVG(score_experience_change) as avg_experience_change,
  MIN(discovered_at) as first_discovered,
  MAX(discovered_at) as last_discovered,
  COUNT(CASE WHEN score_total >= 28 THEN 1 END) as high_score_count
FROM trend_products
WHERE brand_designer IS NOT NULL
GROUP BY nest_id, brand_designer
HAVING COUNT(*) >= 2
ORDER BY product_count DESC, avg_score DESC;

-- パターン検出用のビュー: カテゴリー傾向分析
CREATE OR REPLACE VIEW trend_category_analysis AS
SELECT 
  nest_id,
  category,
  COUNT(*) as product_count,
  AVG(score_total) as avg_score,
  MAX(score_total) as max_score,
  AVG(score_concept_shift) as avg_concept_shift,
  AVG(score_category_disruption) as avg_category_disruption,
  AVG(score_philosophical_pricing) as avg_philosophical_pricing,
  AVG(score_experience_change) as avg_experience_change,
  MIN(discovered_at) as first_discovered,
  MAX(discovered_at) as last_discovered,
  COUNT(CASE WHEN score_total >= 28 THEN 1 END) as high_score_count,
  COUNT(CASE WHEN discovered_at >= NOW() - INTERVAL '7 days' THEN 1 END) as weekly_count,
  COUNT(CASE WHEN discovered_at >= NOW() - INTERVAL '30 days' THEN 1 END) as monthly_count
FROM trend_products
WHERE category IS NOT NULL
GROUP BY nest_id, category
ORDER BY product_count DESC, avg_score DESC;

-- 時系列トレンド分析用のビュー（週次集計）
CREATE OR REPLACE VIEW trend_weekly_stats AS
SELECT 
  nest_id,
  DATE_TRUNC('week', discovered_at) as week_start,
  COUNT(*) as product_count,
  AVG(score_total) as avg_score,
  COUNT(CASE WHEN score_total >= 28 THEN 1 END) as high_score_count,
  COUNT(DISTINCT category) as unique_categories,
  COUNT(DISTINCT brand_designer) as unique_brands,
  AVG(score_concept_shift) as avg_concept_shift,
  AVG(score_category_disruption) as avg_category_disruption,
  AVG(score_philosophical_pricing) as avg_philosophical_pricing,
  AVG(score_experience_change) as avg_experience_change
FROM trend_products
WHERE discovered_at >= NOW() - INTERVAL '90 days'
GROUP BY nest_id, DATE_TRUNC('week', discovered_at)
ORDER BY nest_id, week_start DESC;

-- 月次集計ビュー
CREATE OR REPLACE VIEW trend_monthly_stats AS
SELECT 
  nest_id,
  DATE_TRUNC('month', discovered_at) as month_start,
  COUNT(*) as product_count,
  AVG(score_total) as avg_score,
  MAX(score_total) as max_score,
  COUNT(CASE WHEN score_total >= 28 THEN 1 END) as high_score_count,
  COUNT(DISTINCT category) as unique_categories,
  COUNT(DISTINCT brand_designer) as unique_brands,
  AVG(score_concept_shift) as avg_concept_shift,
  AVG(score_category_disruption) as avg_category_disruption,
  AVG(score_philosophical_pricing) as avg_philosophical_pricing,
  AVG(score_experience_change) as avg_experience_change,
  -- トップカテゴリー
  MODE() WITHIN GROUP (ORDER BY category) as top_category,
  -- トップブランド
  MODE() WITHIN GROUP (ORDER BY brand_designer) as top_brand
FROM trend_products
GROUP BY nest_id, DATE_TRUNC('month', discovered_at)
ORDER BY nest_id, month_start DESC;

-- インデックス追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_trend_products_discovered_at ON trend_products(discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_products_nest_discovered ON trend_products(nest_id, discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_products_category_score ON trend_products(category, score_total DESC);
CREATE INDEX IF NOT EXISTS idx_trend_products_brand_score ON trend_products(brand_designer, score_total DESC);

