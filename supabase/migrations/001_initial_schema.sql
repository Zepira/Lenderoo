-- Lenderoo Database Schema
-- Run this SQL in your Supabase SQL Editor

-- ============================================================================
-- Enable Required Extensions
-- ============================================================================

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Users Table
-- ============================================================================

-- Create users table (extends auth.users with app-specific fields)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================================
-- Friends Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.friends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  total_items_borrowed INTEGER DEFAULT 0,
  current_items_borrowed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on friends table
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- Users can only see their own friends
CREATE POLICY "Users can view own friends"
  ON public.friends
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own friends
CREATE POLICY "Users can insert own friends"
  ON public.friends
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own friends
CREATE POLICY "Users can update own friends"
  ON public.friends
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own friends
CREATE POLICY "Users can delete own friends"
  ON public.friends
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON public.friends(user_id);

-- ============================================================================
-- Items Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  images TEXT[],
  borrowed_by UUID REFERENCES public.friends(id) ON DELETE SET NULL,
  borrowed_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  returned_date TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on items table
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Users can only see their own items
CREATE POLICY "Users can view own items"
  ON public.items
  FOR SELECT
  USING (auth.uid() = user_id);

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

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_items_user_id ON public.items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_borrowed_by ON public.items(borrowed_by);
CREATE INDEX IF NOT EXISTS idx_items_category ON public.items(category);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON public.items(created_at);

-- ============================================================================
-- Borrow History Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.borrow_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.friends(id) ON DELETE CASCADE,
  borrowed_date TIMESTAMPTZ NOT NULL,
  returned_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on borrow_history table
ALTER TABLE public.borrow_history ENABLE ROW LEVEL SECURITY;

-- Users can view history for their own items
CREATE POLICY "Users can view own borrow history"
  ON public.borrow_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.items
      WHERE items.id = borrow_history.item_id
      AND items.user_id = auth.uid()
    )
  );

-- Users can insert history for their own items
CREATE POLICY "Users can insert own borrow history"
  ON public.borrow_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.items
      WHERE items.id = borrow_history.item_id
      AND items.user_id = auth.uid()
    )
  );

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_borrow_history_item_id ON public.borrow_history(item_id);
CREATE INDEX IF NOT EXISTS idx_borrow_history_friend_id ON public.borrow_history(friend_id);

-- ============================================================================
-- Triggers
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for friends table
CREATE TRIGGER update_friends_updated_at
  BEFORE UPDATE ON public.friends
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for items table
CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Auto-create User Profile on Signup
-- ============================================================================

-- Function to create user profile automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- Helpful Views (Optional)
-- ============================================================================

-- View for items with friend information
CREATE OR REPLACE VIEW public.items_with_friends AS
SELECT
  i.*,
  f.name as friend_name,
  f.email as friend_email,
  f.phone as friend_phone
FROM public.items i
LEFT JOIN public.friends f ON i.borrowed_by = f.id;

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant permissions on tables
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.friends TO authenticated;
GRANT ALL ON public.items TO authenticated;
GRANT ALL ON public.borrow_history TO authenticated;

-- Grant permissions on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
