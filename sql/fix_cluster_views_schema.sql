-- cluster_views テーブルの既存構造を新しいDB構造に合わせて修正
-- 実行日: 2025-01-02

-- 1. 既存のRLSポリシーを削除（型変更前に必要）
DROP POLICY IF EXISTS "Users can view own cluster views" ON cluster_views;
DROP POLICY IF EXISTS "Users can insert own cluster views" ON cluster_views;  
DROP POLICY IF EXISTS "Users can update own cluster views" ON cluster_views;
DROP POLICY IF EXISTS "Users can delete own cluster views" ON cluster_views;

-- 2. board_id と nest_id の型を TEXT から UUID に変更
ALTER TABLE cluster_views 
  ALTER COLUMN board_id TYPE UUID USING board_id::UUID,
  ALTER COLUMN nest_id TYPE UUID USING nest_id::UUID;

-- 3. created_by の型を TEXT から UUID に変更  
ALTER TABLE cluster_views 
  ALTER COLUMN created_by TYPE UUID USING created_by::UUID;

-- 4. 外部キー制約を追加（存在しない場合のみ）
DO $$ 
BEGIN
  -- boards への外部キー制約
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_cluster_views_board'
  ) THEN
    ALTER TABLE cluster_views 
    ADD CONSTRAINT fk_cluster_views_board 
    FOREIGN KEY (board_id) REFERENCES public.boards(id) ON DELETE CASCADE;
  END IF;

  -- nests への外部キー制約
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_cluster_views_nest'
  ) THEN
    ALTER TABLE cluster_views 
    ADD CONSTRAINT fk_cluster_views_nest 
    FOREIGN KEY (nest_id) REFERENCES public.nests(id) ON DELETE CASCADE;
  END IF;

  -- users への外部キー制約
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_cluster_views_created_by'
  ) THEN
    ALTER TABLE cluster_views 
    ADD CONSTRAINT fk_cluster_views_created_by 
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. 新しいRLSポリシー（UUID型対応）
CREATE POLICY "Users can view own cluster views" ON cluster_views
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert own cluster views" ON cluster_views
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own cluster views" ON cluster_views
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own cluster views" ON cluster_views
  FOR DELETE USING (auth.uid() = created_by);

-- 6. 確認用クエリ
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'cluster_views' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
