-- Create nest_members table
CREATE TABLE IF NOT EXISTS public.nest_members (
    nest_id UUID NOT NULL REFERENCES public.nests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ,
    PRIMARY KEY (nest_id, user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_nest_members_user_id ON public.nest_members(user_id);
CREATE INDEX IF NOT EXISTS idx_nest_members_nest_id ON public.nest_members(nest_id); 