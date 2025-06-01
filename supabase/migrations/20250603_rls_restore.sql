-- RLS有効化（既に有効化済みの場合はスキップされる）
ALTER TABLE public.nest_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nest_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- nestsテーブルの既存ポリシーを全削除
DROP POLICY IF EXISTS "Nest members can view nests" ON public.nests;
DROP POLICY IF EXISTS "Nest owners can view nests" ON public.nests;
DROP POLICY IF EXISTS "Nest owners can manage nests" ON public.nests;
DROP POLICY IF EXISTS "All users can select nests" ON public.nests;
CREATE POLICY "All users can select nests"
  ON public.nests
  FOR SELECT
  USING (true);
DROP POLICY IF EXISTS "All users can insert nests" ON public.nests;
CREATE POLICY "All users can insert nests"
  ON public.nests
  FOR INSERT
  WITH CHECK (true);
-- 必要なインデックス・制約（既存のものはスキップされる）
CREATE UNIQUE INDEX IF NOT EXISTS board_card_relations_pkey ON public.board_card_relations USING btree (id);
ALTER TABLE public.board_card_relations ADD CONSTRAINT board_card_relations_pkey PRIMARY KEY USING INDEX board_card_relations_pkey; 