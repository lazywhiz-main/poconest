-- Fix nest_members RLS policy to allow INSERT for invitation acceptance
-- This allows authenticated users to insert their own membership records when accepting invitations

DROP POLICY IF EXISTS "Users can join nests" ON public.nest_members;
CREATE POLICY "Users can join nests"
  ON public.nest_members
  FOR INSERT
  WITH CHECK (user_id = auth.uid()); 