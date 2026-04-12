-- Fix borrow_history to reference users instead of friends
-- The items.borrowed_by was updated to reference users in migration 008,
-- but borrow_history.friend_id still pointed at friends. This caused all
-- history inserts to fail with FK violations.

-- Make friend_id nullable first so we can safely alter the constraint
ALTER TABLE public.borrow_history
  ALTER COLUMN friend_id DROP NOT NULL;

-- Drop the old FK to friends table
ALTER TABLE public.borrow_history
  DROP CONSTRAINT IF EXISTS borrow_history_friend_id_fkey;

-- Add new FK to users table
ALTER TABLE public.borrow_history
  ADD CONSTRAINT borrow_history_friend_id_fkey
  FOREIGN KEY (friend_id)
  REFERENCES public.users(id)
  ON DELETE SET NULL;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Allow borrowers to see their own history entries
DROP POLICY IF EXISTS "Borrowers can view their own history" ON public.borrow_history;
CREATE POLICY "Borrowers can view their own history"
  ON public.borrow_history
  FOR SELECT
  USING (friend_id = auth.uid());

-- Allow friends of the item owner to see borrow history
DROP POLICY IF EXISTS "Friends can view item borrow history" ON public.borrow_history;
CREATE POLICY "Friends can view item borrow history"
  ON public.borrow_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.items i
      JOIN public.friend_connections fc ON (
        (fc.user_id = auth.uid() AND fc.friend_user_id = i.user_id)
        OR (fc.user_id = i.user_id AND fc.friend_user_id = auth.uid())
      )
      WHERE i.id = borrow_history.item_id
        AND fc.status = 'active'
    )
  );

-- ============================================================================
-- View: borrow_history_with_users
-- Joins borrow_history with users to expose borrower name and avatar
-- ============================================================================

CREATE OR REPLACE VIEW public.borrow_history_with_users AS
SELECT
  bh.id,
  bh.item_id,
  bh.friend_id,
  bh.borrowed_date,
  bh.returned_date,
  bh.due_date,
  bh.notes,
  bh.created_at,
  u.name  AS borrower_name,
  u.email AS borrower_email,
  u.avatar_url AS borrower_avatar_url
FROM public.borrow_history bh
LEFT JOIN public.users u ON bh.friend_id = u.id;

GRANT SELECT ON public.borrow_history_with_users TO authenticated;
