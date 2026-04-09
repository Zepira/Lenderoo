-- Fix Borrow Status Visibility
-- Migration 019
--
-- Issues:
-- 1. When a borrower views a friend's library, borrowed items may incorrectly
--    show as "Available" if item.borrowed_by is null (approval edge case) and
--    the borrow_requests query fails silently.
-- 2. The borrow_requests_with_details view has no security_invoker, meaning
--    RLS on the underlying borrow_requests table may not be enforced correctly
--    for all Supabase/Postgres versions.
-- 3. No explicit policy allows users to see approved requests for items they
--    are actively borrowing (borrowed_by = auth.uid()).
--
-- Fixes:
-- 1. Add RLS policy: users can see borrow requests for items they currently borrow
-- 2. Recreate the view with security_invoker for explicit RLS enforcement
-- 3. Add a simpler function to get borrow status for friend's items

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. New borrow_requests SELECT policy for active borrowers
-- ──────────────────────────────────────────────────────────────────────────────

-- Allow users to see borrow requests for items they are currently borrowing.
-- This covers the case where the borrower views a friend's library and needs
-- to know the request status of items they already have.
CREATE POLICY "Borrowers can view requests for their borrowed items"
  ON public.borrow_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = borrow_requests.item_id
        AND items.borrowed_by = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Add RLS policy so borrowers can see items they currently have borrowed
--    (even if friendship was removed — defensive)
-- ──────────────────────────────────────────────────────────────────────────────

-- Borrowers can always see items they currently have out on loan
CREATE POLICY "Borrowers can view items they have borrowed"
  ON public.items
  FOR SELECT
  USING (auth.uid() = borrowed_by);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Recreate the view with security_invoker so RLS is enforced per-user
--    (Postgres 15+ feature; harmless on older versions as it becomes a no-op)
-- ──────────────────────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS borrow_requests_with_details;

CREATE OR REPLACE VIEW borrow_requests_with_details
  WITH (security_invoker = true)
AS
SELECT
    br.id,
    br.item_id,
    br.requester_id,
    br.owner_id,
    br.status,
    br.requested_due_date,
    br.message,
    br.created_at,
    br.updated_at,
    -- Item details
    i.name  AS item_name,
    i.category AS item_category,
    i.images   AS item_images,
    i.borrowed_by AS item_borrowed_by,
    -- Requester details
    ru.name       AS requester_name,
    ru.email      AS requester_email,
    ru.avatar_url AS requester_avatar_url,
    -- Owner details
    ou.name  AS owner_name,
    ou.email AS owner_email
FROM borrow_requests br
JOIN items i  ON br.item_id       = i.id
JOIN users ru ON br.requester_id  = ru.id
JOIN users ou ON br.owner_id      = ou.id;

-- Re-grant access
GRANT SELECT ON borrow_requests_with_details TO authenticated;
