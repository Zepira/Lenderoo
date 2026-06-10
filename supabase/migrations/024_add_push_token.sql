-- Add push_token column to users table for Expo push notifications
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Index for efficient lookup when sending notifications
CREATE INDEX IF NOT EXISTS idx_users_push_token ON public.users(push_token) WHERE push_token IS NOT NULL;
