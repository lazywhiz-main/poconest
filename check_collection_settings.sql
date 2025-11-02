-- 現在の収集設定を確認
SELECT 
    id,
    nest_id,
    jsonb_array_length(rss_feeds) as feed_count,
    rss_feeds,
    min_score_threshold,
    duplicate_detection
FROM 
    trend_collection_settings
ORDER BY 
    created_at DESC;

-- RSSフィードの詳細を確認
SELECT 
    nest_id,
    jsonb_array_elements(rss_feeds) as feed
FROM 
    trend_collection_settings;

