-- ブランドウォッチの設定を確認
SELECT 
  nest_id,
  jsonb_array_length(rss_feeds) as rss_count,
  jsonb_array_length(brand_watches) as brand_count,
  jsonb_pretty(rss_feeds) as rss_feeds_detail,
  jsonb_pretty(brand_watches) as brand_watches_detail
FROM trend_collection_settings
WHERE nest_id = '1c13888b-412d-42af-82c8-2b3645ca68ee';

-- 各RSSフィードの有効/無効状態を確認
SELECT 
  nest_id,
  jsonb_array_elements(rss_feeds) as feed
FROM trend_collection_settings
WHERE nest_id = '1c13888b-412d-42af-82c8-2b3645ca68ee';

-- 各ブランドウォッチの有効/無効状態を確認
SELECT 
  nest_id,
  jsonb_array_elements(brand_watches) as brand
FROM trend_collection_settings
WHERE nest_id = '1c13888b-412d-42af-82c8-2b3645ca68ee';

