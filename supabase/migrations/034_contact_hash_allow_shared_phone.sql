-- Phone/email here are unverified, so two different accounts can legitimately
-- collide on the same digits (confirmed on prod: two test accounts already
-- share a phone number). The old unique index on (hash, kind) meant whichever
-- account synced first silently kept the hash and the second account's row
-- was dropped by ON CONFLICT DO NOTHING, making that person permanently
-- unmatchable by phone. Scope uniqueness to the owning user instead, and let
-- match-contacts return every account that hashes to a given contact.

DROP INDEX IF EXISTS idx_unique_contact_hash;
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_contact_hash
  ON public.user_contact_hashes (user_id, hash, kind);

CREATE OR REPLACE FUNCTION public.sync_user_contact_hashes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  digits TEXT;
  last10 TEXT;
BEGIN
  DELETE FROM public.user_contact_hashes WHERE user_id = NEW.id;

  IF NEW.email IS NOT NULL THEN
    INSERT INTO public.user_contact_hashes (user_id, kind, hash)
    VALUES (
      NEW.id,
      'email',
      encode(digest(lower(trim(NEW.email)), 'sha256'), 'hex')
    )
    ON CONFLICT (user_id, hash, kind) DO NOTHING;
  END IF;

  IF NEW.phone IS NOT NULL THEN
    digits := regexp_replace(NEW.phone, '\D', '', 'g');
    IF digits <> '' THEN
      INSERT INTO public.user_contact_hashes (user_id, kind, hash)
      VALUES (NEW.id, 'phone', encode(digest(digits, 'sha256'), 'hex'))
      ON CONFLICT (user_id, hash, kind) DO NOTHING;

      last10 := right(digits, 10);
      IF last10 <> digits THEN
        INSERT INTO public.user_contact_hashes (user_id, kind, hash)
        VALUES (NEW.id, 'phone', encode(digest(last10, 'sha256'), 'hex'))
        ON CONFLICT (user_id, hash, kind) DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Re-run for existing users so the previously-dropped colliding rows appear.
UPDATE public.users SET email = email;
