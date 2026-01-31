-- Fix schema path issues for trigger functions
-- Explicitly set search path and use fully qualified function names

-- Update handle_new_user to explicitly reference public schema
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url, friend_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    public.get_unique_friend_code()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Also update get_unique_friend_code to use search path
CREATE OR REPLACE FUNCTION public.get_unique_friend_code()
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := public.generate_friend_code();
    SELECT EXISTS(SELECT 1 FROM public.users WHERE friend_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Update generate_friend_code with search path
CREATE OR REPLACE FUNCTION public.generate_friend_code()
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
