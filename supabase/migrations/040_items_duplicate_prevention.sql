-- Prevent duplicate items server-side. Until now the only guard against
-- adding the same item twice was a client-side check against a react-query
-- cache that can be empty while still loading (e.g. right after sign-in, or
-- a slow first fetch) — that window let duplicates through with no DB
-- backing to catch them. Every other duplicate-prone table in this app
-- (borrow_requests, item_availability_subscriptions, item_favourites,
-- contact hashes) already has a unique index; items never did.

-- Same name (case/whitespace-insensitive) + category, per owner. Applies to
-- every category, not just books — this is the general "don't own two
-- entries called the same thing" rule.
CREATE UNIQUE INDEX IF NOT EXISTS idx_items_unique_name_per_user
  ON public.items (user_id, category, lower(btrim(name)));

-- Same ISBN, per owner, for books specifically. Catches the case a client
-- title-match can miss: the same book added via two different entry paths
-- (search vs. barcode scan vs. manual entry) can end up with slightly
-- different title strings depending on the source, but the ISBN is the same
-- physical/edition identifier either way.
CREATE UNIQUE INDEX IF NOT EXISTS idx_items_unique_isbn_per_user
  ON public.items (user_id, (metadata->>'isbn'))
  WHERE category = 'book'
    AND metadata->>'isbn' IS NOT NULL
    AND metadata->>'isbn' != '';
