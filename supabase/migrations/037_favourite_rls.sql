-- Favouriting (is_favourite) is a shared flag any authenticated user can toggle,
-- including on items they don't own (e.g. a friend's item in Explore). The
-- existing items UPDATE policy only allows the owner or current borrower to
-- write, so a non-owner favouriting a friend's item fails RLS. Add a
-- permissive policy for any authenticated user, guarded by a trigger that
-- rejects changes to any column except is_favourite unless the caller is the
-- owner or borrower.

CREATE OR REPLACE FUNCTION public.enforce_favourite_only_update()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() = OLD.user_id OR auth.uid() = OLD.borrowed_by THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.name IS DISTINCT FROM OLD.name
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.category IS DISTINCT FROM OLD.category
    OR NEW.images IS DISTINCT FROM OLD.images
    OR NEW.borrowed_by IS DISTINCT FROM OLD.borrowed_by
    OR NEW.borrowed_date IS DISTINCT FROM OLD.borrowed_date
    OR NEW.due_date IS DISTINCT FROM OLD.due_date
    OR NEW.returned_date IS DISTINCT FROM OLD.returned_date
    OR NEW.notes IS DISTINCT FROM OLD.notes
    OR NEW.metadata IS DISTINCT FROM OLD.metadata
    OR NEW.is_unavailable IS DISTINCT FROM OLD.is_unavailable
  THEN
    RAISE EXCEPTION 'Only the owner or borrower can modify this item';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS items_enforce_favourite_only ON public.items;
CREATE TRIGGER items_enforce_favourite_only
  BEFORE UPDATE ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_favourite_only_update();

DROP POLICY IF EXISTS "Any authenticated user can favourite items" ON public.items;
CREATE POLICY "Any authenticated user can favourite items"
  ON public.items
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
