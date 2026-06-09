-- Allow the current borrower of an item to see approved queue entries for
-- that item. This lets the borrower know who is waiting and enables the
-- "hand off to next person" return flow.
CREATE POLICY "Borrowers can view approved queue for their borrowed items"
  ON public.borrow_requests
  FOR SELECT
  USING (
    status = 'approved'
    AND EXISTS (
      SELECT 1 FROM items
      WHERE items.id = borrow_requests.item_id
        AND items.borrowed_by = auth.uid()
    )
  );
