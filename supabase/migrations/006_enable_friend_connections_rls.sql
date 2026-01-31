-- Enable RLS Policies for Friend Connections
-- Allows users to view, create, update, and delete friend connections

-- Users can view friend connections where they are either sender or recipient
CREATE POLICY "Users can view their friend connections"
  ON public.friend_connections
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_user_id);

-- Users can insert friend connections (send friend requests)
CREATE POLICY "Users can send friend requests"
  ON public.friend_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update friend connections they're involved in
-- This allows both sender and recipient to update (e.g., approve request)
CREATE POLICY "Users can update their friend connections"
  ON public.friend_connections
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_user_id);

-- Users can delete friend connections they're involved in
CREATE POLICY "Users can delete their friend connections"
  ON public.friend_connections
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_user_id);
