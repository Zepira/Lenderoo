-- Convert feedback.status from TEXT+CHECK to an enum. Supabase Studio's
-- table editor renders enum columns as a dropdown, so triaging feedback in
-- the UI can no longer hit the check constraint with a typo'd status
-- (e.g. 'fixed' instead of 'resolved').

CREATE TYPE public.feedback_status AS ENUM ('new', 'in_review', 'resolved', 'wont_fix');

-- Drop the old CHECK first — Postgres re-validates it against the new enum
-- type mid-ALTER otherwise, and `status IN ('new', ...)` has no
-- feedback_status = text operator.
ALTER TABLE public.feedback DROP CONSTRAINT IF EXISTS feedback_status_check;

ALTER TABLE public.feedback
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE public.feedback_status USING status::public.feedback_status,
  ALTER COLUMN status SET DEFAULT 'new';

COMMENT ON COLUMN public.feedback.status IS 'Triage state — dropdown in Supabase Studio via the feedback_status enum.';
