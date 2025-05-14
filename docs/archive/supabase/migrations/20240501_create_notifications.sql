-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create policy
DROP POLICY IF EXISTS "ユーザーは自分の通知のみ参照可能" ON public.notifications;
CREATE POLICY "ユーザーは自分の通知のみ参照可能"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ユーザーは自分の通知のみ更新可能" ON public.notifications;
CREATE POLICY "ユーザーは自分の通知のみ更新可能"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ユーザーは自分の通知のみ削除可能" ON public.notifications;
CREATE POLICY "ユーザーは自分の通知のみ削除可能"
    ON public.notifications FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create index
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- nest_invitationsテーブルの更新
alter table public.nest_invitations
add column if not exists target_user_id uuid references public.users(id) on delete cascade; 