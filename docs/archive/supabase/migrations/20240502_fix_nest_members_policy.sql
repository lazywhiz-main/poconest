-- Drop the existing policies that are causing infinite recursion
DROP POLICY IF EXISTS "Nest members can view members" ON public.nest_members;
DROP POLICY IF EXISTS "Nest owners can manage members" ON public.nest_members;

-- Re-create the policies with optimized conditions that avoid recursion
-- Policy for nest members to view other members (no recursion)
CREATE POLICY "nest_members_select_policy"
    ON public.nest_members
    FOR SELECT
    USING (
        -- 自分自身のメンバーシップは常に見れる
        user_id = auth.uid() OR
        -- Nestのオーナーは全メンバーを見れる
        EXISTS (
            SELECT 1 FROM public.nests
            WHERE id = nest_members.nest_id
            AND owner_id = auth.uid()
        )
    );

-- Policy for insert/update/delete operations (オーナーのみ)
CREATE POLICY "nest_members_write_policy"
    ON public.nest_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.nests
            WHERE id = nest_members.nest_id
            AND owner_id = auth.uid()
        )
    );

-- 自分自身のメンバーシップを削除できる（退会用）
CREATE POLICY "nest_members_delete_self_policy"
    ON public.nest_members
    FOR DELETE
    USING (
        user_id = auth.uid()
    ); 