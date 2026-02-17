# Troubleshooting Guide

## Friend Detail Page Not Loading

### Symptoms
- Clicking on a friend in the friend list immediately redirects back
- Console shows errors about loading friend details
- No data is displayed on the friend detail page

### Root Causes

This issue is almost always caused by **missing or incorrect RLS (Row Level Security) policies** on your database tables.

### Step-by-Step Fix

#### Step 1: Check Console Logs

Open your browser's developer console (F12) and look for error messages when clicking on a friend. You should see logs like:

```
🔍 Fetching friend details for: [friend-id]
🔍 Current user ID: [your-id]
👥 Connection found: [connection-data] or null
```

If you see `❌ No active friendship found` or `❌ Error checking friendship`, continue to Step 2.

#### Step 2: Verify RLS Policies Exist

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Run the diagnostic query from `supabase/diagnostics/check_rls_policies.sql`

**Expected Results**:
- All tables should have `rls_enabled = true`
- Each table should have multiple policies:
  - `users`: 3 policies
  - `friend_connections`: 4 policies
  - `items`: 5 policies
  - `borrow_requests`: 5 policies

**If policies are missing**, you need to run the migrations!

#### Step 3: Run Required Migrations

You need to run these migrations IN ORDER:

1. **Migration 009** - Borrow Requests Table
   ```
   File: supabase/migrations/009_borrow_requests.sql
   ```

2. **Migration 011** - Comprehensive RLS Policies ⚠️ CRITICAL
   ```
   File: supabase/migrations/011_comprehensive_rls_policies.sql
   ```

**How to run migrations**:
1. Open Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy the ENTIRE contents of the migration file
4. Paste into the SQL Editor
5. Click "Run"
6. Repeat for each migration

#### Step 4: Verify Data Exists

Run this query in SQL Editor (replace `YOUR_USER_ID` with your actual user ID):

```sql
-- Check if you have friends
SELECT * FROM friend_connections
WHERE (user_id = 'YOUR_USER_ID' OR friend_user_id = 'YOUR_USER_ID')
AND status = 'active';

-- Check if you can see other users
SELECT id, name, email FROM users LIMIT 5;

-- Check if friend_connections work
SELECT
  fc.id,
  fc.status,
  u1.name as user_name,
  u2.name as friend_name
FROM friend_connections fc
JOIN users u1 ON fc.user_id = u1.id
JOIN users u2 ON fc.friend_user_id = u2.id
WHERE fc.user_id = 'YOUR_USER_ID' OR fc.friend_user_id = 'YOUR_USER_ID';
```

If these queries return no results but you know you have friends, it's an RLS issue.

#### Step 5: Clear App Cache

After running migrations:

1. Close the app completely
2. Clear browser cache (if using web)
3. Restart the dev server: `yarn start`
4. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)

### Common Issues and Solutions

#### Issue: "No active friendship found"

**Cause**: The `friend_connections` table might not have the right data or RLS policies are blocking the query.

**Solution**:
1. Verify friendship exists:
   ```sql
   SELECT * FROM friend_connections
   WHERE status = 'active'
   AND (
     (user_id = 'YOUR_ID' AND friend_user_id = 'FRIEND_ID')
     OR
     (user_id = 'FRIEND_ID' AND friend_user_id = 'YOUR_ID')
   );
   ```

2. If no results, check if the friendship was properly created:
   - Go to Friends tab
   - Try accepting a friend request
   - Check if both rows were created in `friend_connections` (bidirectional)

3. Run migration 011 to fix RLS policies

#### Issue: "Error fetching user details"

**Cause**: RLS policy on `users` table is too restrictive or missing.

**Solution**:
1. Run migration 011 which includes:
   ```sql
   CREATE POLICY "Authenticated users can view all profiles"
     ON public.users
     FOR SELECT
     USING (auth.role() = 'authenticated');
   ```

2. This allows any authenticated user to view user profiles (needed for friend features)

#### Issue: Policies exist but still not working

**Cause**: Policies might be incorrectly defined or there's a cache issue.

**Solution**:
1. Drop and recreate policies:
   - Migration 011 includes `DROP POLICY IF EXISTS` statements
   - Run it again to ensure clean state

2. Restart Supabase (if self-hosted)

3. Check for typos in your queries:
   ```sql
   -- Wrong: status.eq.active (missing quotes)
   -- Right: status = 'active'
   ```

### Testing RLS Policies

You can test RLS policies directly in SQL Editor:

```sql
-- Test as authenticated user (simulates app query)
SELECT auth.uid(); -- Should return your user ID

-- Test friend_connections query
SELECT * FROM friend_connections
WHERE (user_id = auth.uid() OR friend_user_id = auth.uid())
AND status = 'active';

-- Test users query (should return all users)
SELECT id, name, email FROM users;

-- Test items query (should return your items + friends' items)
SELECT * FROM items;
```

### Debug Checklist

- [ ] Ran migration 009 (borrow_requests table)
- [ ] Ran migration 011 (comprehensive RLS policies)
- [ ] Verified RLS is enabled on all tables
- [ ] Verified policies exist (3-5 per table)
- [ ] Checked console logs for specific errors
- [ ] Verified friendship exists in database
- [ ] Cleared app cache and restarted
- [ ] Tested queries in SQL Editor work
- [ ] Confirmed I'm logged in as correct user

### Still Not Working?

If you've completed all steps above and it's still not working:

1. **Check the exact error message** in the console
2. **Take a screenshot** of:
   - Console logs
   - SQL Editor diagnostic results
   - The friend_connections table data
3. **Verify your Supabase project** is using the correct credentials in `.env`

### Quick Test

Run this in SQL Editor to test the exact query used by `getFriendUserById`:

```sql
-- Replace FRIEND_USER_ID with the ID of the friend you're trying to view
SELECT
  fc.id,
  fc.status,
  fc.created_at,
  u.id as friend_id,
  u.name,
  u.email,
  u.avatar_url,
  u.friend_code
FROM friend_connections fc
JOIN users u ON u.id = 'FRIEND_USER_ID'
WHERE (
  (fc.user_id = auth.uid() AND fc.friend_user_id = 'FRIEND_USER_ID')
  OR
  (fc.user_id = 'FRIEND_USER_ID' AND fc.friend_user_id = auth.uid())
)
AND fc.status = 'active';
```

If this returns results, the RLS policies are working. If not, policies need to be fixed.

---

## Other Common Issues

### Items Not Showing Counts

See the [Friend Detail Page Not Loading](#friend-detail-page-not-loading) section - same root cause (RLS policies).

### Borrow Requests Not Working

**Symptoms**: Can't create requests, can't see incoming requests, can't approve/deny

**Solution**: Run migration 011 which includes borrow_requests RLS policies.

### "Not authenticated" Errors

**Symptoms**: Random "Not authenticated" errors even though you're logged in

**Possible Causes**:
1. Session expired - try logging out and back in
2. `.env` file has wrong Supabase credentials
3. JWT token expired - restart the app

**Solution**:
1. Check `.env` has correct `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
2. Log out and log back in
3. Restart the dev server

---

## Prevention

To avoid RLS issues in the future:

1. **Always run migrations** when pulling new code
2. **Check migration history** - run SQL Editor query:
   ```sql
   SELECT * FROM supabase_migrations.schema_migrations ORDER BY version DESC;
   ```
3. **Test with SQL Editor first** before debugging in the app
4. **Keep RLS_POLICIES.md handy** for reference on what policies should exist

---

## Need More Help?

If you're still stuck:

1. Check `RLS_POLICIES.md` for detailed policy explanations
2. Run the diagnostic query in `supabase/diagnostics/check_rls_policies.sql`
3. Review migration files to understand what should exist
4. Check Supabase logs in Dashboard → Logs
