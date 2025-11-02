-- 1. thumbnail_urlの状態を確認
SELECT 
    id,
    title_ja,
    url,
    thumbnail_url,
    category,
    discovered_at
FROM 
    trend_products
ORDER BY 
    discovered_at DESC
LIMIT 10;

-- 2. thumbnail_urlがNULLの件数を確認
SELECT 
    COUNT(*) as total_products,
    COUNT(thumbnail_url) as products_with_thumbnail,
    COUNT(*) - COUNT(thumbnail_url) as products_without_thumbnail
FROM 
    trend_products;

-- 3. カテゴリー別のサムネイル取得状況
SELECT 
    category,
    COUNT(*) as total,
    COUNT(thumbnail_url) as with_thumbnail,
    COUNT(*) - COUNT(thumbnail_url) as without_thumbnail
FROM 
    trend_products
GROUP BY 
    category
ORDER BY 
    total DESC;

