-- Friend groups and who can see each item (15 Nov 2026).
--
-- Some people only want to lend some things to some friends. Owners sort friends into their own
-- groups (any name: "Close friends", "Work friends", "Poor book maintainers"), then choose per
-- item who can see and request it:
--   * all     — every friend (the default; items with no item_audience row are 'all')
--   * only    — only friends in the chosen groups
--   * except  — every friend except those in the chosen groups
--
-- Fully private: groups, memberships and an item's rule are readable by the owner alone. A friend
-- an item is hidden from just doesn't get the row; nothing tells them it exists or which group
-- they're in. (That's why the rule lives in its own owner-only table, not columns on items.)
--
-- Someone with a pending or approved (queued) request, or who has the item now, keeps seeing it
-- even if the owner narrows it later, so their request or loan doesn't vanish.
--
-- New items use the owner's default (users.default_visibility / default_visibility_groups),
-- which the app reads from the owner's own users row and applies when saving.

-- ── Groups ──────────────────────────────────────────────────────────────────

CREATE TABLE public.friend_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 40),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX friend_groups_owner_name ON public.friend_groups (owner_id, lower(trim(name)));

CREATE TABLE public.friend_group_members (
  group_id UUID NOT NULL REFERENCES public.friend_groups(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, friend_id)
);
CREATE INDEX friend_group_members_friend ON public.friend_group_members (friend_id);

-- ── Each item's rule ────────────────────────────────────────────────────────

CREATE TABLE public.item_audience (
  item_id UUID PRIMARY KEY REFERENCES public.items(id) ON DELETE CASCADE,
  visibility TEXT NOT NULL DEFAULT 'all' CHECK (visibility IN ('all', 'only', 'except')),
  group_ids UUID[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The owner's default for new items (users is readable by its owner only, migration 049).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS default_visibility TEXT NOT NULL DEFAULT 'all'
    CHECK (default_visibility IN ('all', 'only', 'except')),
  ADD COLUMN IF NOT EXISTS default_visibility_groups UUID[] NOT NULL DEFAULT '{}';

-- An item's groups must be its owner's own groups (no borrowing someone else's group ids).
CREATE OR REPLACE FUNCTION public.item_audience_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.group_ids := ARRAY(SELECT DISTINCT unnest(NEW.group_ids));
  IF EXISTS (
    SELECT 1 FROM unnest(NEW.group_ids) g(id)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.friend_groups fg
      JOIN public.items i ON i.user_id = fg.owner_id
      WHERE fg.id = g.id AND i.id = NEW.item_id
    )
  ) THEN
    RAISE EXCEPTION 'Those groups aren''t yours' USING ERRCODE = '42501';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER item_audience_check
  BEFORE INSERT OR UPDATE ON public.item_audience
  FOR EACH ROW EXECUTE FUNCTION public.item_audience_check();

-- Deleting a group takes it out of every item rule and the owner's default.
CREATE OR REPLACE FUNCTION public.friend_groups_forget()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.item_audience a
    SET group_ids = array_remove(a.group_ids, OLD.id)
    WHERE OLD.id = ANY (a.group_ids);
  UPDATE public.users u
    SET default_visibility_groups = array_remove(u.default_visibility_groups, OLD.id)
    WHERE u.id = OLD.owner_id AND OLD.id = ANY (u.default_visibility_groups);
  RETURN OLD;
END;
$$;
CREATE TRIGGER friend_groups_forget
  AFTER DELETE ON public.friend_groups
  FOR EACH ROW EXECUTE FUNCTION public.friend_groups_forget();

CREATE OR REPLACE FUNCTION public.friend_groups_touch()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER friend_groups_touch
  BEFORE UPDATE ON public.friend_groups
  FOR EACH ROW EXECUTE FUNCTION public.friend_groups_touch();

-- A new item starts with its owner's default, in the same insert, so it's never briefly visible
-- to everyone when the default is narrower. The app then saves any change made on the form.
CREATE OR REPLACE FUNCTION public.items_default_audience()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.item_audience (item_id, visibility, group_ids)
  SELECT NEW.id, u.default_visibility, u.default_visibility_groups
  FROM public.users u
  WHERE u.id = NEW.user_id AND u.default_visibility <> 'all';
  RETURN NEW;
END;
$$;
CREATE TRIGGER items_default_audience
  AFTER INSERT ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.items_default_audience();

-- ── Who can see an item ─────────────────────────────────────────────────────

-- Whether p_viewer (already known to be the owner's friend) may see p_item under its rule.
-- Security definer so it can read the owner-only tables; it only ever answers yes or no.
CREATE OR REPLACE FUNCTION public.item_visible_to(p_item UUID, p_viewer UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    COALESCE((
      SELECT CASE a.visibility
        WHEN 'only' THEN EXISTS (
          SELECT 1 FROM public.friend_group_members m
          WHERE m.friend_id = p_viewer AND m.group_id = ANY (a.group_ids))
        WHEN 'except' THEN NOT EXISTS (
          SELECT 1 FROM public.friend_group_members m
          WHERE m.friend_id = p_viewer AND m.group_id = ANY (a.group_ids))
        ELSE TRUE
      END
      FROM public.item_audience a
      WHERE a.item_id = p_item
    ), TRUE)
    OR EXISTS (
      SELECT 1 FROM public.borrow_requests r
      WHERE r.item_id = p_item AND r.requester_id = p_viewer
        AND r.status IN ('pending', 'approved'));
$$;
REVOKE ALL ON FUNCTION public.item_visible_to(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.item_visible_to(UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS "Users can view friends items" ON public.items;
CREATE POLICY "Users can view friends items"
  ON public.items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.friend_connections
      WHERE status = 'active'
      AND (
        (user_id = auth.uid() AND friend_user_id = items.user_id)
        OR
        (user_id = items.user_id AND friend_user_id = auth.uid())
      )
    )
    AND public.item_visible_to(items.id, auth.uid())
  );

-- A request can only be made for an item the requester is allowed to see (replaces 011's
-- "Users can create requests", which only checked the requester). The items subquery runs
-- under the caller's RLS too, so it also needs friendship.
DROP POLICY IF EXISTS "Users can create requests" ON public.borrow_requests;
DROP POLICY IF EXISTS "Requesters can create requests" ON public.borrow_requests;
CREATE POLICY "Requesters can create requests"
  ON public.borrow_requests
  FOR INSERT
  WITH CHECK (
    auth.uid() = requester_id
    AND EXISTS (SELECT 1 FROM public.items i WHERE i.id = item_id AND i.user_id = owner_id)
    AND public.item_visible_to(item_id, auth.uid())
  );

-- ── Row level security: owner only ──────────────────────────────────────────

ALTER TABLE public.friend_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_audience ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.friend_groups, public.friend_group_members, public.item_audience FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.friend_groups, public.friend_group_members, public.item_audience TO authenticated;

CREATE POLICY "Owners manage their groups"
  ON public.friend_groups
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners manage their group members"
  ON public.friend_group_members
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.friend_groups g WHERE g.id = group_id AND g.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.friend_groups g WHERE g.id = group_id AND g.owner_id = auth.uid()));

CREATE POLICY "Owners manage who sees their items"
  ON public.item_audience
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.items i WHERE i.id = item_id AND i.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.items i WHERE i.id = item_id AND i.user_id = auth.uid()));
