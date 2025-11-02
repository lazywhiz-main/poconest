-- デフォルト設定を挿入する関数を修正（JSON構築を正しい方法で行う）
CREATE OR REPLACE FUNCTION create_default_collection_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- jsonb_build_objectとjsonb_build_arrayを使って正しくJSONを構築
  INSERT INTO trend_collection_settings (nest_id, rss_feeds)
  VALUES (
    NEW.id,
    jsonb_build_array(
      jsonb_build_object(
        'id', gen_random_uuid(),
        'url', 'https://www.dezeen.com/feed/',
        'name', 'Dezeen',
        'enabled', true,
        'language', 'en',
        'category', 'デザインメディア',
        'last_collected', null,
        'products_count', 0
      )
    )
  )
  ON CONFLICT (nest_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーは既に存在するので再作成不要
-- （関数を置き換えるだけでトリガーは自動的に新しい関数を使う）

