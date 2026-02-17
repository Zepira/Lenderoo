-- Fix Items Update Policy for Returning Items
-- Migration 017
--
-- The previous policy fails when borrowers try to return items because
-- the WITH CHECK clause is evaluated AFTER the update, and borrowed_by
-- is now null, so the check fails.
--
-- Solution: Use a more lenient WITH CHECK clause that allows updates
-- if the user was authorized by the USING clause.

-- Drop the existing update policy
DROP POLICY IF EXISTS "Users can update own or borrowed items" ON public.items;

-- Create a new update policy with explicit WITH CHECK
CREATE POLICY "Users can update own or borrowed items"
  ON public.items
  FOR UPDATE
  USING (
    auth.uid() = user_id           -- Owner can update
    OR auth.uid() = borrowed_by    -- Borrower can update
  )
  WITH CHECK (
    auth.uid() = user_id           -- After update, user must be the owner
    OR auth.uid() = borrowed_by    -- OR still be the borrower (if not returned)
    OR borrowed_by IS NULL         -- OR borrowed_by was cleared (item returned)
  );

-- Note: The WITH CHECK allows clearing borrowed_by field when returning items
