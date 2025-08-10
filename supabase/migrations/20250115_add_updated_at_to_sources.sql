-- sourcesテーブルにupdated_atフィールドを追加
-- 既存レコードのupdated_atを現在時刻で初期化

-- 1. updated_atカラムを追加
ALTER TABLE "public"."sources" 
ADD COLUMN "updated_at" timestamp with time zone DEFAULT now();

-- 2. 既存レコードのupdated_atを現在時刻で更新
UPDATE "public"."sources" 
SET "updated_at" = now() 
WHERE "updated_at" IS NULL;

-- 3. updated_atカラムをNOT NULL制約に変更
ALTER TABLE "public"."sources" 
ALTER COLUMN "updated_at" SET NOT NULL;

-- 4. 自動更新トリガーを作成
CREATE OR REPLACE FUNCTION update_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. トリガーを作成
CREATE TRIGGER trigger_sources_updated_at
    BEFORE UPDATE ON "public"."sources"
    FOR EACH ROW
    EXECUTE FUNCTION update_sources_updated_at();

-- 6. コメントを追加
COMMENT ON COLUMN "public"."sources"."updated_at" IS '最終更新日時（自動更新）';
COMMENT ON FUNCTION update_sources_updated_at() IS 'sourcesテーブルのupdated_atを自動更新するトリガー関数';
