-- Split release_notes into "planned" (upcoming, roadmap-style) vs
-- "released" (shipped, changelog-style) so the marketing site can show
-- them as two separate lists instead of one flat feed.

CREATE TYPE public.release_note_status AS ENUM ('planned', 'released');

ALTER TABLE public.release_notes
  ADD COLUMN status public.release_note_status NOT NULL DEFAULT 'released';

-- A planned release may not have a confirmed ship date yet.
ALTER TABLE public.release_notes
  ALTER COLUMN release_date DROP NOT NULL;

COMMENT ON COLUMN public.release_notes.status IS 'planned = upcoming/roadmap, released = shipped changelog entry';
COMMENT ON COLUMN public.release_notes.release_date IS 'Ship date for released entries; optional target date for planned ones.';
