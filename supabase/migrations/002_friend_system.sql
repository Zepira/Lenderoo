-- Friend System Migration
-- Adds friend codes and user-to-user friend connections

-- ============================================================================
-- Add Friend Code to Users Table
-- ============================================================================

-- Add friend_code column to users table (unique 6-digit alphanumeric code)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS friend_code TEXT UNIQUE;

-- Create index on friend_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_friend_code ON public.users(friend_code);

-- Function to generate a unique 6-character friend code
CREATE OR REPLACE FUNCTION generate_friend_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude confusing chars (0,O,1,I)
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to ensure unique friend code generation
CREATE OR REPLACE FUNCTION get_unique_friend_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := generate_friend_code();
    SELECT EXISTS(SELECT 1 FROM public.users WHERE friend_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Generate friend codes for existing users
UPDATE public.users
SET friend_code = get_unique_friend_code()
WHERE friend_code IS NULL;

-- Modify handle_new_user function to generate friend code on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url, friend_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    get_unique_friend_code()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Friend Connections Table (User-to-User Friendships)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.friend_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  friend_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure no duplicate friendships
  UNIQUE(user_id, friend_user_id),

  -- Prevent self-friending
  CHECK (user_id != friend_user_id)
);

-- Enable RLS on friend_connections table
ALTER TABLE public.friend_connections ENABLE ROW LEVEL SECURITY;

-- -- Users can view their own friend connections
-- CREATE POLICY "Users can view own friend connections"
--   ON public.friend_connections
--   FOR SELECT
--   USING (auth.uid() = user_id OR auth.uid() = friend_user_id);

-- -- Users can insert their own friend connections
-- CREATE POLICY "Users can insert own friend connections"
--   ON public.friend_connections
--   FOR INSERT
--   WITH CHECK (auth.uid() = user_id);

-- -- Users can update their own friend connections
-- CREATE POLICY "Users can update own friend connections"
--   ON public.friend_connections
--   FOR UPDATE
--   USING (auth.uid() = user_id);

-- -- Users can delete their own friend connections
-- CREATE POLICY "Users can delete own friend connections"
--   ON public.friend_connections
--   FOR DELETE
--   USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_friend_connections_user_id ON public.friend_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_friend_connections_friend_user_id ON public.friend_connections(friend_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_connections_status ON public.friend_connections(status);

-- -- Trigger for friend_connections updated_at
-- CREATE TRIGGER update_friend_connections_updated_at
--   BEFORE UPDATE ON public.friend_connections
--   FOR EACH ROW
--   EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to add a friend by code (creates bidirectional friendship)
CREATE OR REPLACE FUNCTION add_friend_by_code(p_friend_code TEXT)
RETURNS TABLE(success BOOLEAN, friend_user_id UUID, message TEXT) AS $$
DECLARE
  v_user_id UUID;
  v_friend_id UUID;
  v_existing_connection UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Not authenticated'::TEXT;
    RETURN;
  END IF;

  -- Find user with friend code
  SELECT id INTO v_friend_id
  FROM public.users
  WHERE friend_code = UPPER(p_friend_code);

  IF v_friend_id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Invalid friend code'::TEXT;
    RETURN;
  END IF;

  -- Check if trying to add self
  IF v_friend_id = v_user_id THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Cannot add yourself as a friend'::TEXT;
    RETURN;
  END IF;

  -- Check if friendship already exists
  SELECT id INTO v_existing_connection
  FROM public.friend_connections
  WHERE (user_id = v_user_id AND friend_user_id = v_friend_id)
     OR (user_id = v_friend_id AND friend_user_id = v_user_id);

  IF v_existing_connection IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, v_friend_id, 'Already friends'::TEXT;
    RETURN;
  END IF;

  -- Create bidirectional friendship
  INSERT INTO public.friend_connections (user_id, friend_user_id, status)
  VALUES (v_user_id, v_friend_id, 'active');

  INSERT INTO public.friend_connections (user_id, friend_user_id, status)
  VALUES (v_friend_id, v_user_id, 'active');

  RETURN QUERY SELECT TRUE, v_friend_id, 'Friend added successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Views
-- ============================================================================

-- View for user's friends with their details
CREATE OR REPLACE VIEW public.user_friends AS
SELECT
  fc.id as connection_id,
  fc.user_id,
  fc.friend_user_id,
  fc.status,
  fc.created_at as friends_since,
  u.name as friend_name,
  u.email as friend_email,
  u.avatar_url as friend_avatar_url,
  u.friend_code as friend_code
FROM public.friend_connections fc
JOIN public.users u ON fc.friend_user_id = u.id
WHERE fc.status = 'active';

-- ============================================================================
-- Grant Permissions
-- ============================================================================

GRANT ALL ON public.friend_connections TO authenticated;
GRANT SELECT ON public.user_friends TO authenticated;
