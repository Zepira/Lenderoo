-- Enable Realtime for Items Table
-- Migration 016
--
-- This migration enables realtime updates for the items table so that users
-- can receive instant notifications when items are borrowed, returned, or updated.

-- Enable realtime replication for items table
ALTER PUBLICATION supabase_realtime ADD TABLE public.items;

-- Note: This enables realtime for the entire table.
-- Clients should filter by user_id or borrowed_by on the client side.
