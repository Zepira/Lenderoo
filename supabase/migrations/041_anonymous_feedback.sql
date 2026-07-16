-- Make feedback anonymous: drop every column that traces a submission back
-- to a specific user, and add the fields needed to triage it afterward
-- (status, an admin response, and whether to surface it publicly) plus
-- screenshot attachments.

-- Drop the policies that reference user_id before the column itself.
DROP POLICY IF EXISTS "Users can create feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.feedback;

ALTER TABLE public.feedback
  DROP COLUMN IF EXISTS user_id,
  DROP COLUMN IF EXISTS user_email,
  DROP COLUMN IF EXISTS user_name;

ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'in_review', 'resolved', 'wont_fix')),
  ADD COLUMN IF NOT EXISTS response TEXT,
  ADD COLUMN IF NOT EXISTS display BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS screenshot_urls TEXT[];

COMMENT ON COLUMN public.feedback.status IS 'Triage state: new, in_review, resolved, wont_fix';
COMMENT ON COLUMN public.feedback.response IS 'Optional reply, set by whoever triages the feedback';
COMMENT ON COLUMN public.feedback.display IS 'Whether this feedback is approved to show publicly';
COMMENT ON COLUMN public.feedback.screenshot_urls IS 'Public URLs of attached screenshots, if any';

-- Any authenticated user can submit — the row carries nothing that traces
-- back to who. No "view own feedback" policy anymore: without a user_id
-- there's no ownership left to scope a SELECT to. Rows the triager has
-- marked display = true are readable by any authenticated user, so a future
-- public feedback/testimonials view has something to query without another
-- migration.
CREATE POLICY "Authenticated users can submit feedback"
  ON public.feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view feedback marked for display"
  ON public.feedback
  FOR SELECT
  TO authenticated
  USING (display = true);

-- Storage bucket for screenshot attachments. Deliberately no per-user
-- folder scoping (unlike item-images/avatars) — a userId-prefixed path
-- would itself be an identifying link back to the submitter, defeating the
-- point of this migration.
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-screenshots', 'feedback-screenshots', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload feedback screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'feedback-screenshots');

CREATE POLICY "Anyone can view feedback screenshots"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'feedback-screenshots');
