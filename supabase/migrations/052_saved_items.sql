-- Saved items (15 Nov 2026): the heart becomes "Saved", a list of friends' things you'd like to
-- borrow later, with one push when a saved item is free to borrow again.
--
--   * item_favourites.notify: whether to tell you when it's back (on by default, off per item).
--   * You can only save other people's items. Hearts already on your own items are removed.
--   * saved_item_watchers(): who to tell when an item comes back. Run by the push-notifications
--     function (service role) only. It respects friendship and who can see the item
--     (item_visible_to, migration 051), and skips the owner and whoever just had it.

ALTER TABLE public.item_favourites
  ADD COLUMN IF NOT EXISTS notify BOOLEAN NOT NULL DEFAULT TRUE;

DELETE FROM public.item_favourites f
USING public.items i
WHERE i.id = f.item_id AND i.user_id = f.user_id;

DROP POLICY IF EXISTS "Users can create own favourites" ON public.item_favourites;
CREATE POLICY "Users can create own favourites"
  ON public.item_favourites
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (SELECT 1 FROM public.items i WHERE i.id = item_id AND i.user_id = auth.uid())
  );

-- Turning the alert on or off.
DROP POLICY IF EXISTS "Users can update own favourites" ON public.item_favourites;
CREATE POLICY "Users can update own favourites"
  ON public.item_favourites
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.saved_item_watchers(p_item UUID, p_exclude UUID DEFAULT NULL)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT f.user_id
  FROM public.item_favourites f
  JOIN public.items i ON i.id = f.item_id
  WHERE f.item_id = p_item
    AND f.notify
    AND f.user_id <> i.user_id
    AND f.user_id IS DISTINCT FROM p_exclude
    AND EXISTS (
      SELECT 1 FROM public.friend_connections c
      WHERE c.status = 'active'
        AND ((c.user_id = f.user_id AND c.friend_user_id = i.user_id)
          OR (c.user_id = i.user_id AND c.friend_user_id = f.user_id))
    )
    AND public.item_visible_to(p_item, f.user_id);
$$;
REVOKE ALL ON FUNCTION public.saved_item_watchers(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.saved_item_watchers(UUID, UUID) TO service_role;
