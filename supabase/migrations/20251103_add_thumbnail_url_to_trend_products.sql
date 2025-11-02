-- トレンド製品テーブルにサムネイルURL列を追加
ALTER TABLE trend_products ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- インデックスは不要（検索に使用しないため）

COMMENT ON COLUMN trend_products.thumbnail_url IS '製品のサムネイル画像URL（Open Graph画像またはプレースホルダー）';

