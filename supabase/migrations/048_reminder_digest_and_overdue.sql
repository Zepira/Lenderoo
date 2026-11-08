-- Daily reminder digest + "time's up" (overdue) push + claim-back push.
-- See docs/NOTIFICATIONS.md for the full picture.
--
-- 1. items.overdue_notified_at — once-per-loan guard for the overdue push.
-- 2. A BEFORE UPDATE trigger that resets it (and due_soon_reminded_at) when a
--    loan changes hands or its due date moves. Done in the DB rather than the
--    client so older app builds still reset it correctly.
-- 3. Widen the items push-webhook trigger. It previously fired only when
--    is_unavailable flipped, so the pending-handoff push (#7) never actually
--    reached the edge function; it now also fires on pending_recipient_id and
--    borrowed_by changes (the latter drives the claim-back push).
-- 4. Replace the weekly return-reminders and daily due-soon-reminders cron
--    jobs with a single daily reminder-digest job: at most one reminder push
--    per person per day, grouped when several items apply.

-- ── 1. Overdue guard column ──────────────────────────────────────────────
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS overdue_notified_at TIMESTAMPTZ;

COMMENT ON COLUMN public.items.overdue_notified_at IS
  'When the "time''s up" push fired for the current loan; NULL means not yet sent. Reset by items_reset_reminder_flags on hand-over or due-date change.';

-- ── 2. Reset reminder flags when the loan changes ────────────────────────
CREATE OR REPLACE FUNCTION public.items_reset_reminder_flags()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.borrowed_by IS DISTINCT FROM OLD.borrowed_by
     OR NEW.due_date IS DISTINCT FROM OLD.due_date THEN
    NEW.overdue_notified_at := NULL;
    NEW.due_soon_reminded_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS items_reset_reminder_flags ON public.items;
CREATE TRIGGER items_reset_reminder_flags
  BEFORE UPDATE ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION public.items_reset_reminder_flags();

-- ── 3. Widen the push webhook trigger ────────────────────────────────────
DROP TRIGGER IF EXISTS items_notify_push ON public.items;
CREATE TRIGGER items_notify_push
  AFTER UPDATE ON public.items
  FOR EACH ROW
  WHEN (
    OLD.is_unavailable IS DISTINCT FROM NEW.is_unavailable
    OR OLD.pending_recipient_id IS DISTINCT FROM NEW.pending_recipient_id
    OR OLD.borrowed_by IS DISTINCT FROM NEW.borrowed_by
  )
  EXECUTE FUNCTION public.notify_push_webhook();

-- ── 4. Cron: one daily digest replaces the two reminder jobs ─────────────
select cron.unschedule('return-reminders-weekly')
where exists (select 1 from cron.job where jobname = 'return-reminders-weekly');

select cron.unschedule('due-soon-reminders-daily')
where exists (select 1 from cron.job where jobname = 'due-soon-reminders-daily');

-- Same Vault secret the old jobs used (CRON_SECRET on the function side).
select cron.schedule(
  'reminder-digest-daily',
  '0 9 * * *',
  $$
  select net.http_post(
    url := 'https://ymboxvasluhlwgofrpya.supabase.co/functions/v1/reminder-digest',
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
