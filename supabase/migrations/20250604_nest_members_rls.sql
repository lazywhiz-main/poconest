-- nest_members: 自分のuser_idの行だけSELECTできる
DROP POLICY IF EXISTS "Nest members can view members" ON public.nest_members;
CREATE POLICY "Nest members can view their own membership"
  ON public.nest_members
  FOR SELECT
  USING (user_id = auth.uid()); 