-- Allow authenticated users to search for other users
-- This is needed for the friend search feature

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;

-- Create a new policy that allows authenticated users to read all user profiles
-- This is necessary for friend search and friend code features
CREATE POLICY "Authenticated users can view user profiles"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- Note: This allows all authenticated users to see other users' names, emails, and friend codes
-- This is necessary for the friend search and friend code features
-- If you need more privacy, you could add a "searchable" boolean column and restrict based on that
