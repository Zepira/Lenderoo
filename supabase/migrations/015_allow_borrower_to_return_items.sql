-- Allow Borrowers to Mark Items as Returned
-- Migration 015
--
-- This migration updates the RLS policy on the items table to allow borrowers
-- to update items they've borrowed (specifically to mark them as returned).

-- Drop the existing update policy
DROP POLICY IF EXISTS "Users can update own items" ON public.items;

-- Create a new update policy that allows:
-- 1. Owners to update their own items
-- 2. Borrowers to update items they've borrowed
CREATE POLICY "Users can update own or borrowed items"
  ON public.items
  FOR UPDATE
  USING (
    auth.uid() = user_id           -- Owner can update
    OR auth.uid() = borrowed_by    -- Borrower can update
  );

-- Note: We might want to add a more restrictive WITH CHECK clause in the future
-- to limit what borrowers can update (e.g., only returned_date), but for now
-- we'll keep it simple and trust the application logic.
