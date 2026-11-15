-- Which app build each person has installed (15 Nov 2026), so Alana can see by name who has and
-- hasn't updated to a new build on iOS and Android, and who to check with.
--
--   * user_app_versions: one row per person per platform (their latest seen build). Nobody can
--     read it through the API, not even the person themselves; only the dashboard (service role).
--   * record_app_version(): the app calls it on sign-in and when it comes back to the foreground
--     (at most every 30 minutes). It only ever writes the caller's own row.
--   * app_version_report: the dashboard view (name, platform, version, build, OS, last seen).
--     Read it in the Supabase SQL editor: SELECT * FROM app_version_report;
--
-- delete-account removes the rows. Privacy policy: "the app version you're using" is now stored
-- against your account (lenderoo.com PR #3).

CREATE TABLE IF NOT EXISTS public.user_app_versions (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  app_version TEXT NOT NULL CHECK (length(app_version) BETWEEN 1 AND 32),
  build_number TEXT CHECK (length(build_number) <= 32),
  os_version TEXT CHECK (length(os_version) <= 32),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, platform)
);

ALTER TABLE public.user_app_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_app_versions FROM PUBLIC, anon, authenticated;
-- No policies: nothing is readable or writable through the API except via the function below.

CREATE OR REPLACE FUNCTION public.record_app_version(
  p_platform TEXT,
  p_app_version TEXT,
  p_build_number TEXT DEFAULT NULL,
  p_os_version TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.user_app_versions (user_id, platform, app_version, build_number, os_version)
  VALUES (auth.uid(), p_platform, left(p_app_version, 32), left(p_build_number, 32), left(p_os_version, 32))
  ON CONFLICT (user_id, platform) DO UPDATE
    SET app_version = EXCLUDED.app_version,
        build_number = EXCLUDED.build_number,
        os_version = EXCLUDED.os_version,
        last_seen_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.record_app_version(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_app_version(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Dashboard only (owned by postgres, no grants to API roles).
CREATE OR REPLACE VIEW public.app_version_report AS
SELECT
  u.name,
  v.platform,
  v.app_version,
  v.build_number,
  v.os_version,
  v.last_seen_at,
  v.first_seen_at,
  u.id AS user_id
FROM public.user_app_versions v
JOIN public.users u ON u.id = v.user_id
WHERE u.deleted_at IS NULL
-- Newest build first (numerically: 1.10.0 after 1.9.0, build 10 after 9).
ORDER BY
  v.platform,
  string_to_array(regexp_replace(v.app_version, '[^0-9.]', '', 'g'), '.')::int[] DESC,
  NULLIF(regexp_replace(COALESCE(v.build_number, ''), '[^0-9]', '', 'g'), '')::bigint DESC NULLS LAST,
  u.name;
REVOKE ALL ON public.app_version_report FROM PUBLIC, anon, authenticated;
