-- Create nest_invitations table
CREATE TABLE IF NOT EXISTS public.nest_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nest_id UUID NOT NULL REFERENCES public.nests(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_accepted BOOLEAN DEFAULT false,
    accepted_at TIMESTAMPTZ
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_nest_invitations_email ON public.nest_invitations(email);
CREATE INDEX IF NOT EXISTS idx_nest_invitations_token ON public.nest_invitations(token);
CREATE INDEX IF NOT EXISTS idx_nest_invitations_nest_id ON public.nest_invitations(nest_id);
CREATE INDEX IF NOT EXISTS idx_nest_invitations_target_user_id ON public.nest_invitations(target_user_id); 