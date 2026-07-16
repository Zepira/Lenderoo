-- Release notes table + open up display=true feedback to anonymous readers.
--
-- Powers the "Roadmap & Feature Requests" page on the marketing site
-- (lenderoo.com), which is unauthenticated — it needs to read this data
-- without a logged-in Supabase session, unlike the app itself.

-- ── Release notes ────────────────────────────────────────────────────────
-- One row per shipped version. `highlights` is a plain text array so it can
-- be edited as dot points directly in the Supabase Studio table editor —
-- no markdown, just add/remove array entries.
CREATE TABLE IF NOT EXISTS public.release_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'all' CHECK (platform IN ('all', 'ios', 'android')),
    release_date DATE NOT NULL,
    highlights TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_release_notes_release_date ON public.release_notes(release_date DESC);

COMMENT ON COLUMN public.release_notes.highlights IS 'Dot-point "what''s new" entries — one array element per bullet, copy-pasted from the App Store Connect / Play Console release notes.';

ALTER TABLE public.release_notes ENABLE ROW LEVEL SECURITY;

-- Public changelog — readable by anyone, including the anon-key marketing
-- site. Writes are done from Supabase Studio (or the service role), so no
-- INSERT/UPDATE policy is needed for anon or authenticated.
CREATE POLICY "Anyone can view release notes"
    ON public.release_notes
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- ── Public feedback ──────────────────────────────────────────────────────
-- The existing "display = true" policy only granted the authenticated
-- role, which is fine for the app but leaves out the anon-key marketing
-- site. Add the same read, scoped to anon.
CREATE POLICY "Anon can view feedback marked for display"
    ON public.feedback
    FOR SELECT
    TO anon
    USING (display = true);
