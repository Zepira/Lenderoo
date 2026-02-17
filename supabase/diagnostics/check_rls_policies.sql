-- Diagnostic Query: Check RLS Policies
-- Run this in Supabase SQL Editor to verify your RLS policies are correctly set up

-- 1. Check if RLS is enabled on tables
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'friend_connections', 'items', 'borrow_requests')
ORDER BY tablename;

-- Expected output: All tables should have rls_enabled = true

-- 2. List all policies for each table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd as command,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Expected output: Should see multiple policies for each table

-- 3. Count policies per table
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Expected output:
-- users: 3 policies (view all, update own, insert own)
-- friend_connections: 4 policies (view, create, update, delete)
-- items: 5 policies (view own, view friends, insert, update, delete)
-- borrow_requests: 5 policies (view outgoing, view incoming, create, update as requester, update as owner)

-- 4. Check specific policies for users table
SELECT
  policyname,
  cmd,
  qual as using_expression,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users'
ORDER BY policyname;

-- 5. Check specific policies for friend_connections table
SELECT
  policyname,
  cmd,
  qual as using_expression,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'friend_connections'
ORDER BY policyname;

-- 6. Check specific policies for items table
SELECT
  policyname,
  cmd,
  qual as using_expression,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'items'
ORDER BY policyname;

-- 7. Test query as authenticated user (replace YOUR_USER_ID with actual ID)
-- This will show if you can query friend_connections
-- SELECT * FROM friend_connections WHERE user_id = 'YOUR_USER_ID' OR friend_user_id = 'YOUR_USER_ID';

-- 8. Test query for users table (should return all users)
-- SELECT id, name, email FROM users LIMIT 5;
