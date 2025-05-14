-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Add RLS policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own notifications
CREATE POLICY "Users can view their own notifications"
    ON public.notifications
    FOR SELECT
    USING (user_id = auth.uid());

-- Policy for users to update their own notifications
CREATE POLICY "Users can update their own notifications"
    ON public.notifications
    FOR UPDATE
    USING (user_id = auth.uid());

-- Policy for users to delete their own notifications
CREATE POLICY "Users can delete their own notifications"
    ON public.notifications
    FOR DELETE
    USING (user_id = auth.uid()); 