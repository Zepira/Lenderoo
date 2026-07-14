-- Lets any user favourite an item (heart icon on item cards/detail page).
-- Simple shared flag on the item row — matches the is_unavailable pattern.

ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS is_favourite BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_items_is_favourite ON public.items(is_favourite);
