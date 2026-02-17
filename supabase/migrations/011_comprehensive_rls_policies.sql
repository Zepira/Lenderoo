-- Migration: Comprehensive RLS Policies
-- Sets up all necessary Row Level Security policies to ensure the app works correctly
-- This migration replaces/updates all existing policies to be more permissive where needed

-- ============================================================================
-- USERS TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view user profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- Users can view all user profiles (needed for friend discovery, avatars, etc.)
CREATE POLICY "Authenticated users can view all profiles"
  ON public.users
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (for signup)
CREATE POLICY "Users can insert own profile"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- FRIEND_CONNECTIONS TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their friend connections" ON public.friend_connections;
DROP POLICY IF EXISTS "Users can send friend requests" ON public.friend_connections;
DROP POLICY IF EXISTS "Users can update their friend connections" ON public.friend_connections;
DROP POLICY IF EXISTS "Users can delete their friend connections" ON public.friend_connections;

-- Users can view friend connections where they are involved
CREATE POLICY "Users can view their connections"
  ON public.friend_connections
  FOR SELECT
  USING (
    auth.uid() = user_id OR auth.uid() = friend_user_id
  );

-- Users can create friend connections (send requests)
CREATE POLICY "Users can create connections"
  ON public.friend_connections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update connections where they are involved
CREATE POLICY "Users can update their connections"
  ON public.friend_connections
  FOR UPDATE
  USING (
    auth.uid() = user_id OR auth.uid() = friend_user_id
  );

-- Users can delete connections where they are involved
CREATE POLICY "Users can delete their connections"
  ON public.friend_connections
  FOR DELETE
  USING (
    auth.uid() = user_id OR auth.uid() = friend_user_id
  );

-- ============================================================================
-- ITEMS TABLE
-- ============================================================================

-- Policies already created in migration 010, but let's ensure they're correct
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own items" ON public.items;
DROP POLICY IF EXISTS "Users can view friends items" ON public.items;
DROP POLICY IF EXISTS "Users can insert own items" ON public.items;
DROP POLICY IF EXISTS "Users can update own items" ON public.items;
DROP POLICY IF EXISTS "Users can delete own items" ON public.items;

-- Users can view their own items
CREATE POLICY "Users can view own items"
  ON public.items
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view items owned by their friends (for borrow requests and browsing)
CREATE POLICY "Users can view friends items"
  ON public.items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM friend_connections
      WHERE status = 'active'
      AND (
        (user_id = auth.uid() AND friend_user_id = items.user_id)
        OR
        (user_id = items.user_id AND friend_user_id = auth.uid())
      )
    )
  );

-- Users can insert their own items
CREATE POLICY "Users can insert own items"
  ON public.items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own items
-- Note: This also allows updating borrowed_by when approving borrow requests
CREATE POLICY "Users can update own items"
  ON public.items
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own items
CREATE POLICY "Users can delete own items"
  ON public.items
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- BORROW_REQUESTS TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their outgoing requests" ON public.borrow_requests;
DROP POLICY IF EXISTS "Users can view their incoming requests" ON public.borrow_requests;
DROP POLICY IF EXISTS "Users can create borrow requests" ON public.borrow_requests;
DROP POLICY IF EXISTS "Requesters can update their requests" ON public.borrow_requests;
DROP POLICY IF EXISTS "Owners can update requests for their items" ON public.borrow_requests;

-- Users can view requests they sent
CREATE POLICY "Users can view outgoing requests"
  ON public.borrow_requests
  FOR SELECT
  USING (auth.uid() = requester_id);

-- Users can view requests for items they own
CREATE POLICY "Users can view incoming requests"
  ON public.borrow_requests
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Users can create borrow requests
CREATE POLICY "Users can create requests"
  ON public.borrow_requests
  FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- Requesters can update their own requests (for cancellation)
CREATE POLICY "Requesters can update requests"
  ON public.borrow_requests
  FOR UPDATE
  USING (auth.uid() = requester_id);

-- Owners can update requests for their items (for approval/denial)
CREATE POLICY "Owners can update requests"
  ON public.borrow_requests
  FOR UPDATE
  USING (auth.uid() = owner_id);

-- ============================================================================
-- BORROW_HISTORY TABLE (if used)
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own borrow history" ON public.borrow_history;
DROP POLICY IF EXISTS "Users can insert own borrow history" ON public.borrow_history;

-- Users can view borrow history for their items
CREATE POLICY "Users can view own history"
  ON public.borrow_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = borrow_history.item_id
      AND items.user_id = auth.uid()
    )
  );

-- System can insert borrow history (usually triggered automatically)
CREATE POLICY "Users can insert history"
  ON public.borrow_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = borrow_history.item_id
      AND items.user_id = auth.uid()
    )
  );

-- ============================================================================
-- FRIENDS TABLE (legacy, if still in use)
-- ============================================================================

-- This table might be deprecated in favor of friend_connections
-- But adding policies just in case

DROP POLICY IF EXISTS "Users can view own friends" ON public.friends;
DROP POLICY IF EXISTS "Users can insert own friends" ON public.friends;
DROP POLICY IF EXISTS "Users can update own friends" ON public.friends;
DROP POLICY IF EXISTS "Users can delete own friends" ON public.friends;

CREATE POLICY "Users can view own friends"
  ON public.friends
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own friends"
  ON public.friends
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own friends"
  ON public.friends
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own friends"
  ON public.friends
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- You can verify policies were created by running:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
