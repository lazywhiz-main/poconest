-- Create nest_settings table
CREATE TABLE IF NOT EXISTS public.nest_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nest_id UUID NOT NULL REFERENCES public.nests(id) ON DELETE CASCADE,
    privacy_settings JSONB DEFAULT '{
        "inviteRestriction": "owner_only",
        "contentVisibility": "members_only",
        "memberListVisibility": "members_only"
    }'::jsonb,
    notification_settings JSONB DEFAULT '{
        "emailNotifications": true,
        "pushNotifications": true,
        "mentionNotifications": true
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trigger for updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.nest_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_nest_settings_nest_id ON public.nest_settings(nest_id); 