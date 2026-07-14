-- Contact-based friend discovery: an optional, unverified phone number on the
-- user's profile, plus a private hash index so the client can find which
-- device contacts already have a Lenderoo account without ever sending raw
-- contact data (names, every phone/email on the device) to the server.
--
-- Matching only happens through the match-contacts edge function
-- (service role) — no client-facing SELECT policy on the hash table.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE TABLE IF NOT EXISTS public.user_contact_hashes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('phone', 'email')),
  hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_contact_hash
  ON public.user_contact_hashes (hash, kind);
CREATE INDEX IF NOT EXISTS idx_contact_hashes_user_id
  ON public.user_contact_hashes(user_id);

ALTER TABLE public.user_contact_hashes ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: only the trigger function (SECURITY DEFINER)
-- writes here, and only the edge function's service-role client reads it.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.sync_user_contact_hashes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
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

  IF NEW.phone IS NOT NULL AND regexp_replace(NEW.phone, '\D', '', 'g') <> '' THEN
    INSERT INTO public.user_contact_hashes (user_id, kind, hash)
    VALUES (
      NEW.id,
      'phone',
      encode(digest(regexp_replace(NEW.phone, '\D', '', 'g'), 'sha256'), 'hex')
    )
    ON CONFLICT (hash, kind) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_sync_contact_hashes ON public.users;
CREATE TRIGGER users_sync_contact_hashes
  AFTER INSERT OR UPDATE OF email, phone ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_contact_hashes();

-- Backfill hashes for existing users
UPDATE public.users SET email = email;
