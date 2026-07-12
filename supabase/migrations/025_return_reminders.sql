-- Track when a borrower was last nudged to return an overdue/week-old
-- borrowed item, so the weekly reminder job doesn't re-notify every run.
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;
