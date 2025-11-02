-- title_jaのデータを確認
SELECT 
    id,
    title_original,
    title_ja,
    CASE 
        WHEN title_ja IS NULL THEN 'NULL'
        WHEN title_ja = '' THEN 'EMPTY'
        WHEN title_ja = title_original THEN 'SAME'
        ELSE 'DIFFERENT'
    END as title_ja_status
FROM 
    trend_products
ORDER BY 
    discovered_at DESC
LIMIT 10;

