-- チャットルームテーブルを作成
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nest_id UUID NOT NULL REFERENCES public.nests(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id),
  is_default BOOLEAN DEFAULT false NOT NULL,
  is_archived BOOLEAN DEFAULT false NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- RLSポリシーの設定
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

-- チャットルームの参照ポリシー（Nestメンバーのみ）
CREATE POLICY "chat_rooms_select_policy" 
  ON public.chat_rooms 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.nest_members 
      WHERE nest_members.nest_id = chat_rooms.nest_id 
      AND nest_members.user_id = auth.uid()
    )
  );

-- チャットルームの作成ポリシー（Nestメンバーのみ）
CREATE POLICY "chat_rooms_insert_policy" 
  ON public.chat_rooms 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.nest_members 
      WHERE nest_members.nest_id = chat_rooms.nest_id 
      AND nest_members.user_id = auth.uid()
    )
  );

-- チャットルームの更新ポリシー（作成者またはNestオーナーのみ）
CREATE POLICY "chat_rooms_update_policy" 
  ON public.chat_rooms 
  FOR UPDATE 
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.nest_members nm
      JOIN public.nests n ON nm.nest_id = n.id
      WHERE n.id = chat_rooms.nest_id 
      AND n.owner_id = auth.uid()
    )
  );

-- チャットルームの削除ポリシー（作成者またはNestオーナーのみ）
CREATE POLICY "chat_rooms_delete_policy" 
  ON public.chat_rooms 
  FOR DELETE 
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.nest_members nm
      JOIN public.nests n ON nm.nest_id = n.id
      WHERE n.id = chat_rooms.nest_id 
      AND n.owner_id = auth.uid()
    )
  );

-- チャットルームのインデックス
CREATE INDEX IF NOT EXISTS idx_chat_rooms_nest_id ON public.chat_rooms(nest_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_created_by ON public.chat_rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_created_at ON public.chat_rooms(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_default ON public.chat_rooms(nest_id, is_default);

-- リアルタイム通知のためにテーブルを追加
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;

-- Nest作成時にデフォルトのチャットルームを作成するための関数を更新
CREATE OR REPLACE FUNCTION public.handle_new_nest()
RETURNS TRIGGER AS $$
BEGIN
  -- オーナーをメンバーとして追加
  INSERT INTO public.nest_members (nest_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  
  -- デフォルトのチャットルームを追加
  INSERT INTO public.chat_rooms (nest_id, name, created_by, is_default)
  VALUES (NEW.id, 'General', NEW.owner_id, true);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- チャットルームを扱うための関数

-- Nestに所属するチャットルーム一覧を取得
CREATE OR REPLACE FUNCTION public.get_nest_chat_rooms(p_nest_id UUID)
RETURNS SETOF public.chat_rooms
SECURITY DEFINER
AS $$
BEGIN
  -- ユーザーがNestのメンバーであることを確認
  IF NOT EXISTS (
    SELECT 1 
    FROM public.nest_members
    WHERE nest_id = p_nest_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'ユーザーはこのNestのメンバーではありません。';
  END IF;

  RETURN QUERY
  SELECT * 
  FROM public.chat_rooms
  WHERE nest_id = p_nest_id AND is_archived = false
  ORDER BY 
    is_default DESC, -- デフォルトを先頭に
    created_at ASC;
END;
$$ LANGUAGE plpgsql; 