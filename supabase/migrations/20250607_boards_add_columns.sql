-- boardsテーブルに不足カラムを追加
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS owner_id uuid;
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false; 