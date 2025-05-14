-- Add RLS policies for nests table
ALTER TABLE public.nests ENABLE ROW LEVEL SECURITY;

-- Policy for nest members to view nests
CREATE POLICY "Nest members can view nests"
    ON public.nests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.nest_members
            WHERE nest_id = nests.id
            AND user_id = auth.uid()
        )
        OR owner_id = auth.uid()
    );

-- Policy for nest owners to update nests
CREATE POLICY "Nest owners can update nests"
    ON public.nests
    FOR UPDATE
    USING (owner_id = auth.uid());

-- Policy for nest owners to delete nests
CREATE POLICY "Nest owners can delete nests"
    ON public.nests
    FOR DELETE
    USING (owner_id = auth.uid());

-- Add RLS policies for nest_members table
ALTER TABLE public.nest_members ENABLE ROW LEVEL SECURITY;

-- Policy for nest members to view members
CREATE POLICY "Nest members can view members"
    ON public.nest_members
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.nest_members
            WHERE nest_id = nest_members.nest_id
            AND user_id = auth.uid()
        )
    );

-- Policy for nest owners to manage members
CREATE POLICY "Nest owners can manage members"
    ON public.nest_members
    USING (
        EXISTS (
            SELECT 1 FROM public.nests
            WHERE id = nest_members.nest_id
            AND owner_id = auth.uid()
        )
    );

-- Add RLS policies for nest_settings table
ALTER TABLE public.nest_settings ENABLE ROW LEVEL SECURITY;

-- Policy for nest members to view settings
CREATE POLICY "Nest members can view settings"
    ON public.nest_settings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.nest_members
            WHERE nest_id = nest_settings.nest_id
            AND user_id = auth.uid()
        )
    );

-- Policy for nest owners to update settings
CREATE POLICY "Nest owners can update settings"
    ON public.nest_settings
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.nests
            WHERE id = nest_settings.nest_id
            AND owner_id = auth.uid()
        )
    ); 