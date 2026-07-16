-- Replace the free-text "Max Borrow Duration" (items.metadata->>'maxBorrowDuration',
-- e.g. "2 weeks", "asap!!", anything a user typed) with a real, validated
-- column. This is what lets the app compute a real due_date and drive the
-- due-soon reminder push — see supabase/functions/due-soon-reminders and
-- docs/NOTIFICATIONS.md.

ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS max_borrow_days INTEGER
    CHECK (max_borrow_days IS NULL OR (max_borrow_days > 0 AND max_borrow_days <= 365));

-- Tracks whether the due-soon reminder has already fired for the CURRENT
-- loan, so the daily cron doesn't re-notify every run. Reset to NULL
-- whenever a new loan starts or the item is returned (see confirmHandoff in
-- lib/services/database.ts).
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS due_soon_reminded_at TIMESTAMPTZ;

COMMENT ON COLUMN public.items.max_borrow_days IS 'Owner-set max borrow window in days (structured, not free text). Drives due_date on pickup and the due-soon reminder.';
COMMENT ON COLUMN public.items.due_soon_reminded_at IS 'Last time the due-soon reminder fired for the current loan; NULL means not yet sent this loan.';

-- Best-effort backfill from the old free-text field: only clean values like
-- "2 weeks", "10 days", "1 month" convert; anything else (blank, "asap!!",
-- "2-3 weeks", etc.) is left NULL rather than guessed at.
UPDATE public.items i
SET max_borrow_days = sub.days
FROM (
  SELECT
    id,
    (regexp_match(lower(trim(metadata->>'maxBorrowDuration')), '^(\d+)\s*(day|days|week|weeks|month|months)$'))[1]::int *
    CASE (regexp_match(lower(trim(metadata->>'maxBorrowDuration')), '^(\d+)\s*(day|days|week|weeks|month|months)$'))[2]
      WHEN 'day' THEN 1
      WHEN 'days' THEN 1
      WHEN 'week' THEN 7
      WHEN 'weeks' THEN 7
      WHEN 'month' THEN 30
      WHEN 'months' THEN 30
    END AS days
  FROM public.items
  WHERE metadata->>'maxBorrowDuration' ~* '^\s*\d+\s*(day|days|week|weeks|month|months)\s*$'
) sub
WHERE i.id = sub.id;

-- The app no longer reads this key — drop it so it can't drift from
-- max_borrow_days and confuse a future reader of raw metadata.
UPDATE public.items
SET metadata = metadata - 'maxBorrowDuration'
WHERE metadata ? 'maxBorrowDuration';

-- ── Due-soon reminder config ─────────────────────────────────────────────
-- Same singleton table the weekly return-reminders job reads from
-- (migration 027). {{item}} and {{days}} tokens get replaced at send time.
ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS due_soon_reminder_days_before INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS due_soon_reminder_title TEXT NOT NULL DEFAULT 'Due soon',
  ADD COLUMN IF NOT EXISTS due_soon_reminder_body TEXT NOT NULL DEFAULT '"{{item}}" is due back in {{days}} days.';

COMMENT ON COLUMN public.notification_settings.due_soon_reminder_days_before IS 'How many days before due_date the due-soon push fires. Fixed lead time, not proportional to max_borrow_days.';

-- ── Cron: daily due-soon-reminders edge function ─────────────────────────
-- Needs daily (not weekly) granularity so a fixed days-before-due lead time
-- lands on the right day. Reuses the same 'return_reminders_cron_secret'
-- Vault entry as migration 026 — both edge functions check the same
-- CRON_SECRET, so no new secret needs to be created.
select cron.schedule(
  'due-soon-reminders-daily',
  '0 9 * * *',
  $$
  select net.http_post(
    url := 'https://ymboxvasluhlwgofrpya.supabase.co/functions/v1/due-soon-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'return_reminders_cron_secret'
      ),
      'Content-Type', 'application/json'
    )
  );
  $$
);
