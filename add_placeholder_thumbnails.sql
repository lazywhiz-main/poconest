-- 既存の全製品にカテゴリー別プレースホルダー画像を設定
UPDATE trend_products
SET thumbnail_url = CASE 
    WHEN category = '家具' THEN 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop'
    WHEN category = '電子機器' THEN 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=300&fit=crop'
    WHEN category = 'ファッション' THEN 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=300&fit=crop'
    WHEN category = '照明' THEN 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=400&h=300&fit=crop'
    WHEN category = 'インテリア' THEN 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400&h=300&fit=crop'
    WHEN category = 'キッチン' THEN 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&h=300&fit=crop'
    ELSE 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&h=300&fit=crop'
END
WHERE thumbnail_url IS NULL;

-- 実行後、確認
SELECT 
    category,
    COUNT(*) as total,
    COUNT(thumbnail_url) as with_thumbnail
FROM 
    trend_products
GROUP BY 
    category;

