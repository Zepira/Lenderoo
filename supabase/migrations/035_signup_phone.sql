-- Let sign-up collect an optional phone number (same unverified field used
-- for contact matching) and store it on the auto-created profile row.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url, phone, friend_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'phone',
    public.get_unique_friend_code()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
