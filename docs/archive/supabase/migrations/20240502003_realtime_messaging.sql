-- メッセージテーブルの構造拡張
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS chat_room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_by JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS has_pinned_to_board BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_messages_chat_room_id ON public.messages(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_read_by ON public.messages USING GIN(read_by);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- リアルタイム通知のためにテーブルを追加
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- メッセージを既読にするための関数
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(
  p_chat_room_id UUID,
  p_message_ids UUID[]
)
RETURNS BOOLEAN
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_read_by JSONB;
  v_message_record RECORD;
BEGIN
  -- ユーザーIDの存在確認
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- 各メッセージに対して処理
  FOR v_message_record IN 
    SELECT id, read_by FROM public.messages 
    WHERE id = ANY(p_message_ids) AND chat_room_id = p_chat_room_id
  LOOP
    -- 既読情報を更新
    v_read_by := COALESCE(v_message_record.read_by, '{}'::jsonb);
    
    -- ユーザーIDがまだ既読リストになければ追加
    IF NOT(v_read_by ? v_user_id::text) THEN
      v_read_by := v_read_by || jsonb_build_object(v_user_id::text, extract(epoch from now())::bigint);
      
      -- 更新を実行
      UPDATE public.messages
      SET read_by = v_read_by
      WHERE id = v_message_record.id;
    END IF;
  END LOOP;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- RLSポリシーをメッセージテーブルに設定
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- メッセージテーブルのポリシー
CREATE POLICY "messages_select_policy" 
  ON public.messages 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.nest_members 
      WHERE nest_members.nest_id = messages.nest_id 
      AND nest_members.user_id = auth.uid()
    )
  );

CREATE POLICY "messages_insert_policy" 
  ON public.messages 
  FOR INSERT 
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.nest_members 
      WHERE nest_members.nest_id = messages.nest_id 
      AND nest_members.user_id = auth.uid()
    )
  );

CREATE POLICY "messages_update_policy" 
  ON public.messages 
  FOR UPDATE 
  USING (
    sender_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.nest_members nm
      JOIN public.nests n ON nm.nest_id = n.id
      WHERE n.id = messages.nest_id 
      AND n.owner_id = auth.uid()
    )
  );

CREATE POLICY "messages_delete_policy" 
  ON public.messages 
  FOR DELETE 
  USING (
    sender_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.nest_members nm
      JOIN public.nests n ON nm.nest_id = n.id
      WHERE n.id = messages.nest_id 
      AND n.owner_id = auth.uid()
    )
  ); 