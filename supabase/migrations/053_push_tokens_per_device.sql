-- Push tokens per device (15 Nov 2026).
--
-- users.push_token held one token per person, so with Lenderoo on a phone and an iPad only the
-- device used last got notifications, and signing out left the token attached to the account.
--
--   * user_push_tokens: one row per device token. A token belongs to whoever signed in on that
--     device last (signing into another account moves it), and is removed on sign-out.
--   * register_push_token() / unregister_push_token(): what the app calls (no direct writes).
--   * push_tokens_for(): every token for some users, for the push functions (service role only).
--     It still includes users.push_token, so builds from before this change keep getting pushes.
--
-- Note: numbered after 052 (saved items, PR #23); apply 052 first.

CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  token TEXT PRIMARY KEY CHECK (length(token) BETWEEN 10 AND 300),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_push_tokens_user ON public.user_push_tokens (user_id);

-- Bring over the tokens people already have.
INSERT INTO public.user_push_tokens (token, user_id)
SELECT push_token, id FROM public.users
WHERE push_token IS NOT NULL AND length(push_token) BETWEEN 10 AND 300
ON CONFLICT (token) DO NOTHING;

ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_push_tokens FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.user_push_tokens TO authenticated;
CREATE POLICY "Users see their own device tokens"
  ON public.user_push_tokens FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- This device's token now belongs to the signed-in user (moving it from anyone else).
CREATE OR REPLACE FUNCTION public.register_push_token(p_token TEXT, p_platform TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.user_push_tokens (token, user_id, platform)
  VALUES (p_token, auth.uid(), p_platform)
  ON CONFLICT (token) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        platform = COALESCE(EXCLUDED.platform, public.user_push_tokens.platform),
        updated_at = now();
  -- The old single-token column: keep it for older builds, but never on someone else.
  UPDATE public.users SET push_token = NULL WHERE push_token = p_token AND id <> auth.uid();
  UPDATE public.users SET push_token = p_token WHERE id = auth.uid();
END;
$$;

-- Signing out on this device: stop sending this account's pushes to it.
CREATE OR REPLACE FUNCTION public.unregister_push_token(p_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.user_push_tokens WHERE token = p_token AND user_id = auth.uid();
  UPDATE public.users SET push_token = NULL WHERE id = auth.uid() AND push_token = p_token;
END;
$$;

REVOKE ALL ON FUNCTION public.register_push_token(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unregister_push_token(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_push_token(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unregister_push_token(TEXT) TO authenticated;

-- Every device token for these users (plus the old column), for the push functions.
CREATE OR REPLACE FUNCTION public.push_tokens_for(p_users UUID[])
RETURNS TABLE (user_id UUID, token TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT t.user_id, t.token FROM public.user_push_tokens t WHERE t.user_id = ANY (p_users)
  UNION
  SELECT u.id, u.push_token FROM public.users u
  WHERE u.id = ANY (p_users) AND u.push_token IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.push_tokens_for(UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.push_tokens_for(UUID[]) TO service_role;

-- A token Expo says is dead, from wherever it's stored.
CREATE OR REPLACE FUNCTION public.forget_push_tokens(p_tokens TEXT[])
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  DELETE FROM public.user_push_tokens WHERE token = ANY (p_tokens);
  UPDATE public.users SET push_token = NULL WHERE push_token = ANY (p_tokens);
$$;
REVOKE ALL ON FUNCTION public.forget_push_tokens(TEXT[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.forget_push_tokens(TEXT[]) TO service_role;
