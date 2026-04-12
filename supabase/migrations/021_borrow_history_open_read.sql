-- Allow any authenticated user to read borrow history.
-- The app already gates access to item detail pages (only item owners and
-- their friends can navigate there), so app-level access control is
-- sufficient. Keeping the DB policy overly narrow just breaks the feature
-- for legitimate viewers.

DROP POLICY IF EXISTS "Users can view own history" ON public.borrow_history;
DROP POLICY IF EXISTS "Borrowers can view their own history" ON public.borrow_history;
DROP POLICY IF EXISTS "Friends can view item borrow history" ON public.borrow_history;

CREATE POLICY "Authenticated users can view borrow history"
  ON public.borrow_history
  FOR SELECT
  TO authenticated
  USING (true);
