-- Migration: Add RLS Policies for Items Table
-- Allows users to view their own items and items owned by their friends

-- Drop existing policies if any (in case they were manually added)
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

-- Users can view items owned by their friends
-- This allows viewing items for borrow requests and friend item lists
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
CREATE POLICY "Users can update own items"
  ON public.items
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own items
CREATE POLICY "Users can delete own items"
  ON public.items
  FOR DELETE
  USING (auth.uid() = user_id);
