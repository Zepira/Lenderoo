-- Update Items to Support User-to-User Lending
-- Changes borrowed_by to reference users table instead of friends table

-- Drop the old foreign key constraint
ALTER TABLE public.items
  DROP CONSTRAINT IF EXISTS items_borrowed_by_fkey;

-- Add new foreign key constraint to users table
ALTER TABLE public.items
  ADD CONSTRAINT items_borrowed_by_fkey
  FOREIGN KEY (borrowed_by)
  REFERENCES public.users(id)
  ON DELETE SET NULL;

-- Update the items_with_friends view to join with users instead
CREATE OR REPLACE VIEW public.items_with_friends AS
SELECT
  i.*,
  u.name as friend_name,
  u.email as friend_email,
  '' as friend_phone
FROM public.items i
LEFT JOIN public.users u ON i.borrowed_by = u.id;

-- Grant permissions on updated view
GRANT SELECT ON public.items_with_friends TO authenticated;
