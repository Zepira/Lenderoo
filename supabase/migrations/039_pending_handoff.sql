-- Two-sided handoff confirmation
--
-- Every transition onto/off of "borrowed" now goes through a pending
-- recipient who must explicitly confirm before the item actually moves.
-- Covers fresh pickups (owner approves/lends), returns to the owner, and
-- peer-to-peer hand-offs to the next queued borrower.

ALTER TABLE public.items
  ADD COLUMN pending_recipient_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.items
  ADD COLUMN pending_since TIMESTAMPTZ;

-- Replaces the migration 015 policy. The current borrower could already
-- update items they hold; now the pending recipient can too, so they can
-- confirm a hand-off directly with the borrower (no owner involvement
-- required) — this is what makes peer-to-peer hand-off actually work under
-- RLS instead of requiring the owner to perform the transfer.
DROP POLICY IF EXISTS "Users can update own or borrowed items" ON public.items;

CREATE POLICY "Users can update own, borrowed, or pending-recipient items"
  ON public.items
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR auth.uid() = borrowed_by
    OR auth.uid() = pending_recipient_id
  );
