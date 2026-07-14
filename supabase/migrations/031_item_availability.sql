-- Lets an owner mark an item they own temporarily unavailable (e.g. broken,
-- travelling with it) so friends can't borrow it, without going through the
-- borrowed_by/borrow_requests flow. Friends can subscribe to be notified
-- when the owner flips it back to available.

ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS is_unavailable BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.item_availability_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified_at TIMESTAMPTZ
);

-- Only one active (un-notified) subscription per user per item
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_availability_sub
  ON public.item_availability_subscriptions (item_id, user_id)
  WHERE notified_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_availability_subs_item_id
  ON public.item_availability_subscriptions(item_id);
CREATE INDEX IF NOT EXISTS idx_availability_subs_user_id
  ON public.item_availability_subscriptions(user_id);

ALTER TABLE public.item_availability_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own availability subscriptions"
  ON public.item_availability_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own availability subscriptions"
  ON public.item_availability_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own availability subscriptions"
  ON public.item_availability_subscriptions
  FOR DELETE
  USING (auth.uid() = user_id);

GRANT ALL ON public.item_availability_subscriptions TO authenticated;

-- Fire the push-notifications edge function only when the availability flag
-- actually flips, not on every item edit.
DROP TRIGGER IF EXISTS items_notify_push ON public.items;
CREATE TRIGGER items_notify_push
  AFTER UPDATE ON public.items
  FOR EACH ROW
  WHEN (OLD.is_unavailable IS DISTINCT FROM NEW.is_unavailable)
  EXECUTE FUNCTION public.notify_push_webhook();
