-- Privacy: make data access match the lenderoo.app privacy policy.
--
-- Before this migration:
--   * any signed-in user could read every column of every users row (email,
--     phone, push_token, friend_code) — policy from 011;
--   * any signed-in user could read all borrow_history — policy from 021;
--   * the views user_friends, items_with_friends and borrow_history_with_users
--     were plain (security definer) views, so they ignored RLS completely and
--     were readable with just the public anon key, no sign-in: every friend
--     connection with emails and friend codes, every item, every loan.
--
-- After:
--   * users: you can read only your own row. Everyone else is visible only
--     through public_profiles (id, name, avatar_url).
--   * Finding people: search_users() (name contains, or exact email) and
--     find_user_by_friend_code() (exact code) return id, name and avatar_url
--     only — never another user's email, phone or friend code.
--   * borrow_history: readable by the item's owner and the borrower only.
--   * All views run as the caller (security_invoker) and join
--     public_profiles; email columns are kept (always NULL) so older app
--     builds that still select them don't error. items_with_friends is unused
--     and dropped.
--   * anon (signed-out) gets nothing from any of these.

-- ============================================================================
-- public_profiles: the only way to read other users
-- ============================================================================

-- A plain view owned by postgres, so it reads users past RLS, but it only
-- exposes the three columns the policy says others may see. Tombstoned
-- accounts (deleted_at set) already show as "Deleted User" with no avatar.
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT u.id, u.name, u.avatar_url
FROM public.users u;

REVOKE ALL ON public.public_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_profiles TO authenticated;

-- ============================================================================
-- users: own row only
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can view user profiles" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;

CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Signed-out clients never need the users table (the signup trigger runs as
-- SECURITY DEFINER).
REVOKE ALL ON public.users FROM anon;

-- ============================================================================
-- Finding people to add as friends
-- ============================================================================

-- Name contains the query (case-insensitive), or the email matches it
-- exactly. Partial emails never match, so this can't be used to discover
-- addresses. Returns no email.
CREATE OR REPLACE FUNCTION public.search_users(p_query TEXT)
RETURNS TABLE (id UUID, name TEXT, avatar_url TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH q AS (
    SELECT
      trim(coalesce(p_query, '')) AS raw,
      -- escape LIKE wildcards so "%" or "_" in the query match literally
      replace(replace(replace(trim(coalesce(p_query, '')), '\', '\\'), '%', '\%'), '_', '\_') AS pattern
  )
  SELECT u.id, u.name, u.avatar_url
  FROM public.users u, q
  WHERE auth.uid() IS NOT NULL
    AND length(q.raw) >= 2
    AND u.id <> auth.uid()
    AND u.deleted_at IS NULL
    AND (
      u.name ILIKE '%' || q.pattern || '%'
      OR lower(u.email) = lower(q.raw)
    )
  ORDER BY u.name
  LIMIT 20;
$$;

CREATE OR REPLACE FUNCTION public.find_user_by_friend_code(p_code TEXT)
RETURNS TABLE (id UUID, name TEXT, avatar_url TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.name, u.avatar_url
  FROM public.users u
  WHERE auth.uid() IS NOT NULL
    AND u.deleted_at IS NULL
    AND u.friend_code = upper(trim(coalesce(p_code, '')))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.search_users(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.find_user_by_friend_code(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_users(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_user_by_friend_code(TEXT) TO authenticated;

-- ============================================================================
-- borrow_history: item owner and borrower only
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view borrow history" ON public.borrow_history;
DROP POLICY IF EXISTS "Users can view own history" ON public.borrow_history;
DROP POLICY IF EXISTS "Borrowers can view their own history" ON public.borrow_history;
DROP POLICY IF EXISTS "Friends can view item borrow history" ON public.borrow_history;
DROP POLICY IF EXISTS "Owner or borrower can view borrow history" ON public.borrow_history;

CREATE POLICY "Owner or borrower can view borrow history"
  ON public.borrow_history
  FOR SELECT
  TO authenticated
  USING (
    friend_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.items
      WHERE items.id = borrow_history.item_id
        AND items.user_id = auth.uid()
    )
  );

REVOKE ALL ON public.borrow_history FROM anon;

-- ============================================================================
-- Views: run as the caller, other users via public_profiles
-- ============================================================================

DROP VIEW IF EXISTS public.items_with_friends;

DROP VIEW IF EXISTS public.user_friends;
CREATE VIEW public.user_friends
  WITH (security_invoker = true)
AS
SELECT
  fc.id AS connection_id,
  fc.user_id,
  fc.friend_user_id,
  fc.status,
  fc.created_at AS friends_since,
  p.name AS friend_name,
  NULL::text AS friend_email,      -- kept for older app builds; never filled
  p.avatar_url AS friend_avatar_url,
  NULL::text AS friend_code        -- kept for older app builds; never filled
FROM public.friend_connections fc
JOIN public.public_profiles p ON p.id = fc.friend_user_id
WHERE fc.status = 'active'
  AND fc.user_id = auth.uid();

DROP VIEW IF EXISTS public.borrow_history_with_users;
CREATE VIEW public.borrow_history_with_users
  WITH (security_invoker = true)
AS
SELECT
  bh.id,
  bh.item_id,
  bh.friend_id,
  bh.borrowed_date,
  bh.returned_date,
  bh.due_date,
  bh.notes,
  bh.created_at,
  p.name AS borrower_name,
  NULL::text AS borrower_email,    -- kept for older app builds; never filled
  p.avatar_url AS borrower_avatar_url
FROM public.borrow_history bh
LEFT JOIN public.public_profiles p ON p.id = bh.friend_id;

DROP VIEW IF EXISTS public.borrow_requests_with_details;
CREATE VIEW public.borrow_requests_with_details
  WITH (security_invoker = true)
AS
SELECT
  br.id,
  br.item_id,
  br.requester_id,
  br.owner_id,
  br.status,
  br.requested_due_date,
  br.message,
  br.created_at,
  br.updated_at,
  i.name AS item_name,
  i.category AS item_category,
  i.images AS item_images,
  i.borrowed_by AS item_borrowed_by,
  ru.name AS requester_name,
  NULL::text AS requester_email,   -- kept for older app builds; never filled
  ru.avatar_url AS requester_avatar_url,
  ou.name AS owner_name,
  NULL::text AS owner_email        -- kept for older app builds; never filled
FROM public.borrow_requests br
JOIN public.items i ON i.id = br.item_id
JOIN public.public_profiles ru ON ru.id = br.requester_id
JOIN public.public_profiles ou ON ou.id = br.owner_id;

REVOKE ALL ON public.user_friends, public.borrow_history_with_users, public.borrow_requests_with_details
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.user_friends, public.borrow_history_with_users, public.borrow_requests_with_details
  TO authenticated;
