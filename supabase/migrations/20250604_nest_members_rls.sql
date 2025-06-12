-- nest_members: 自分のuser_idの行だけSELECTできる
DROP POLICY IF EXISTS "Nest members can view members" ON public.nest_members;
CREATE POLICY "Nest members can view their own membership"
  ON public.nest_members
  FOR SELECT
  USING (user_id = auth.uid());

-- nest_members: 認証されたユーザーが自分のuser_idでINSERTできる（招待承諾用）
DROP POLICY IF EXISTS "Users can join nests" ON public.nest_members;
CREATE POLICY "Users can join nests"
  ON public.nest_members
  FOR INSERT
  WITH CHECK (user_id = auth.uid()); 