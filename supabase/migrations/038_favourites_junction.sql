-- Favouriting must be per-viewer (a friend's item shown in Explore is seen by
-- many users, each of whom can favourite it independently), not a single
-- shared flag on the item row. Replace the is_favourite column (036/037)
-- with a proper junction table, mirroring item_availability_subscriptions.

DROP TRIGGER IF EXISTS items_enforce_favourite_only ON public.items;
DROP FUNCTION IF EXISTS public.enforce_favourite_only_update();
DROP POLICY IF EXISTS "Any authenticated user can favourite items" ON public.items;
DROP INDEX IF EXISTS idx_items_is_favourite;
ALTER TABLE public.items DROP COLUMN IF EXISTS is_favourite;

CREATE TABLE IF NOT EXISTS public.item_favourites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (item_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_item_favourites_item_id ON public.item_favourites(item_id);
CREATE INDEX IF NOT EXISTS idx_item_favourites_user_id ON public.item_favourites(user_id);

ALTER TABLE public.item_favourites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favourites"
  ON public.item_favourites
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own favourites"
  ON public.item_favourites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favourites"
  ON public.item_favourites
  FOR DELETE
  USING (auth.uid() = user_id);

GRANT ALL ON public.item_favourites TO authenticated;
