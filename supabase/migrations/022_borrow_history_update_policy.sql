-- Add UPDATE policy to borrow_history so that closeOpenHistoryEntry can
-- set returned_date when an item is marked as returned.
-- Without this, all UPDATE calls silently fail → returned_date stays null
-- → every history entry shows as "Active" forever.

-- Item owner can update history entries for their items (they call markItemReturned)
CREATE POLICY "Item owner can update borrow history"
  ON public.borrow_history
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.items
      WHERE items.id = borrow_history.item_id
        AND items.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.items
      WHERE items.id = borrow_history.item_id
        AND items.user_id = auth.uid()
    )
  );

-- Borrower can update their own history entries (they can also call markItemReturned)
CREATE POLICY "Borrower can update own history entries"
  ON public.borrow_history
  FOR UPDATE
  TO authenticated
  USING (friend_id = auth.uid())
  WITH CHECK (friend_id = auth.uid());
