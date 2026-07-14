-- Android/iOS contact exports don't consistently include the country code
-- (e.g. a locally-entered Android contact may be "4155551234" while the
-- account owner registered "+14155551234"), so a single full-digit hash
-- was missing real matches cross-platform. Also hash the last-10-digit
-- national number as a second "phone" hash so either representation
-- matches, regardless of which side has the country code.

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
    ON CONFLICT (hash, kind) DO NOTHING;
  END IF;

  IF NEW.phone IS NOT NULL THEN
    digits := regexp_replace(NEW.phone, '\D', '', 'g');
    IF digits <> '' THEN
      INSERT INTO public.user_contact_hashes (user_id, kind, hash)
      VALUES (NEW.id, 'phone', encode(digest(digits, 'sha256'), 'hex'))
      ON CONFLICT (hash, kind) DO NOTHING;

      last10 := right(digits, 10);
      IF last10 <> digits THEN
        INSERT INTO public.user_contact_hashes (user_id, kind, hash)
        VALUES (NEW.id, 'phone', encode(digest(last10, 'sha256'), 'hex'))
        ON CONFLICT (hash, kind) DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Re-run for existing users so already-set phone numbers get the new variant.
UPDATE public.users SET email = email;
