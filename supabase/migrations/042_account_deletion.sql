-- Account deletion support: mark a users row as a tombstone instead of
-- hard-deleting it. The row (and its id) is kept so every FK pointing at it
-- — closed borrow_history entries, items now correctly shown as returned —
-- stays valid instead of orphaning. All PII columns on this row are scrubbed
-- by the delete-account edge function at deletion time; this migration only
-- adds the marker column.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_deleted_at
  ON public.users (deleted_at)
  WHERE deleted_at IS NOT NULL;
