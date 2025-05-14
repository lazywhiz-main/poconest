-- 既存のnest_membersテーブルのポリシーをすべて削除
DROP POLICY IF EXISTS "Nest members can view members" ON public.nest_members;
DROP POLICY IF EXISTS "Nest owners can manage members" ON public.nest_members;
DROP POLICY IF EXISTS "nest_members_select_policy" ON public.nest_members;
DROP POLICY IF EXISTS "nest_members_write_policy" ON public.nest_members;
DROP POLICY IF EXISTS "nest_members_delete_self_policy" ON public.nest_members;
DROP POLICY IF EXISTS "nest_members_select_self" ON public.nest_members;
DROP POLICY IF EXISTS "nest_members_select_same_nest" ON public.nest_members;
DROP POLICY IF EXISTS "nest_members_insert_owner" ON public.nest_members;
DROP POLICY IF EXISTS "nest_members_delete_owner" ON public.nest_members;
DROP POLICY IF EXISTS "nest_members_delete_self" ON public.nest_members;

-- 簡潔で明確な新しいポリシーを作成（無限再帰を避ける）
-- ユーザー自身のメンバーシップ情報は常に見れるようにする
CREATE POLICY "nest_members_select_self"
    ON public.nest_members
    FOR SELECT
    USING (user_id = auth.uid());

-- 同じネストに所属するメンバー同士は情報を見れるようにする
CREATE POLICY "nest_members_select_by_nest"
    ON public.nest_members
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.nests 
            WHERE id = nest_members.nest_id 
            AND (
                -- ネストのオーナーか、あるいは自分もそのネストのメンバー
                owner_id = auth.uid() OR
                id IN (
                    SELECT nest_id FROM public.nest_members 
                    WHERE user_id = auth.uid()
                )
            )
        )
    );

-- オーナーは全操作可能
CREATE POLICY "nest_members_owner_all"
    ON public.nest_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.nests
            WHERE id = nest_members.nest_id
            AND owner_id = auth.uid()
        )
    );

-- 自分自身のメンバーシップは削除可能（退会）
CREATE POLICY "nest_members_delete_self"
    ON public.nest_members
    FOR DELETE
    USING (user_id = auth.uid()); 