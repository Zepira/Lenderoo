# Row Level Security (RLS) Policies Reference

This document explains the RLS policies implemented in the Lenderoo database.

## Overview

Row Level Security (RLS) is enabled on all tables in the database. This ensures that users can only access data they're authorized to see. The policies are designed to be **secure but permissive enough** for the app to function properly.

## Policy Structure by Table

### 👤 Users Table

**Purpose**: Store user profiles and authentication data

**Policies** (migration 049):
- ✅ **View own profile** - Users can read only their own row (email, phone, push token, friend code)
- ✅ **Update own profile** - Users can only update their own profile
- ✅ **Insert own profile** - Users can create their own profile on signup

**Other users** are read through the `public_profiles` view: `id`, `name`, `avatar_url` only. This is what the lenderoo.app privacy policy promises ("they see your name and profile photo"). Never add email, phone, push token or friend code to it.

**Finding people** uses SECURITY DEFINER functions that return `id, name, avatar_url`:
- `search_users(p_query)` - name contains the query, or email matches it exactly (partial emails never match)
- `find_user_by_friend_code(p_code)` - exact friend code

**Views** that show other people (`user_friends`, `borrow_history_with_users`, `borrow_requests_with_details`) are `security_invoker` and join `public_profiles`. Their old email/friend-code columns stay but are always NULL, so older app builds don't error. Any new view must be `security_invoker = true`: a plain view ignores RLS and is readable with the anon key.

`scripts/check-privacy-rls.mjs` checks all of this against the local stack.

**Access Pattern**: Own row only; others by name and photo

---

### 👥 Friend Connections Table

**Purpose**: Track friendships between users

**Policies**:
- ✅ **View connections** - Users can view connections where they are either `user_id` or `friend_user_id`
- ✅ **Create connections** - Users can create connections (send friend requests) as `user_id`
- ✅ **Update connections** - Users can update connections where they're involved (for accepting requests)
- ✅ **Delete connections** - Users can delete connections where they're involved (for unfriending)

**Access Pattern**: Bidirectional - both sides of a friendship can see and manage it

---

### 📦 Items Table

**Purpose**: Store items in user libraries

**Policies**:
- ✅ **View own items** - Users can view all items they own
- ✅ **View friends' items** - Users can view items owned by their active friends
  - *Why?* Needed for:
    - Browsing friends' items
    - Creating borrow requests
    - Showing item counts
  - *Security*: Only works if there's an active friendship in `friend_connections`
- ✅ **Insert own items** - Users can create their own items
- ✅ **Update own items** - Users can update their own items
  - *Includes*: Setting `borrowed_by` when approving borrow requests
- ✅ **Delete own items** - Users can delete their own items

**Access Pattern**: Own items + friends' items (read-only for friends' items)

**Key Query Pattern**:
```sql
-- This query will work for both owned and friends' items:
SELECT * FROM items WHERE user_id = '...' -- Works due to RLS policies
```

---

### 🤝 Borrow Requests Table

**Purpose**: Handle item borrowing requests between friends

**Policies**:
- ✅ **View outgoing requests** - Users can view requests they sent (`requester_id`)
- ✅ **View incoming requests** - Users can view requests for items they own (`owner_id`)
- ✅ **Create requests** - Users can create requests as the requester
- ✅ **Update as requester** - Requesters can update their requests (for cancellation)
- ✅ **Update as owner** - Owners can update requests for their items (for approval/denial)

**Access Pattern**: Bidirectional - both requester and owner can see and manage requests

---

### 📚 Borrow History Table

**Purpose**: Track historical record of borrowed items

**Policies**:
- ✅ **View history** - The item's owner and the borrower (`friend_id`) only (migration 049)
- ✅ **Insert history** - Users can create history records for their items
- ✅ **Update history** - Owner or borrower (migration 022)

**Access Pattern**: You see loans you lent or borrowed, never other people's

---

### 👫 Friends Table (Legacy)

**Purpose**: Old friend tracking system (may be deprecated)

**Policies**:
- ✅ **View own friends** - Users can view their own friend records
- ✅ **Insert/Update/Delete own friends** - Users can manage their own friend records

**Access Pattern**: Owner-only access

---

## Common Issues and Solutions

### Issue: "No data returned" even though data exists

**Cause**: RLS policies are blocking the query

**Debug Steps**:
1. Check if RLS is enabled: `SELECT relrowsecurity FROM pg_class WHERE relname = 'table_name';`
2. Check existing policies: `SELECT * FROM pg_policies WHERE tablename = 'table_name';`
3. Test with service role (bypasses RLS) to confirm data exists

**Solution**: Ensure the comprehensive RLS migration (011) has been run

### Issue: "Permission denied" when creating/updating

**Cause**: Missing INSERT/UPDATE policies or incorrect WITH CHECK clause

**Solution**: Verify the user is authenticated and the policy's WITH CHECK matches their use case

### Issue: Can't see friend's data

**Cause**: Missing "view friends' items" policy or friendship not active

**Solution**:
1. Verify friendship exists in `friend_connections` with `status = 'active'`
2. Ensure migration 011 has been run
3. Check that the friendship is bidirectional (both rows exist)

---

## Security Principles

### What's Protected
- ✅ Users can only modify their own data (items, profile)
- ✅ Users can only see items from active friends
- ✅ Users can only approve/deny requests for their own items
- ✅ Users can only cancel their own requests

### What's Permissive
- ✅ Every signed-in user can see every other user's name and photo (needed for friend discovery), nothing more
- ✅ Friends can view each other's items (needed for borrowing)
- ✅ Both sides of a friendship can manage the connection

### Design Philosophy

The policies follow these principles:

1. **Secure by Default** - RLS is enabled on all tables
2. **Permissive Where Needed** - Users can see what they need to use the app
3. **Strict for Writes** - Users can only modify their own data
4. **Friendship-Based** - Many permissions are gated by active friendships

---

## Testing RLS Policies

You can test RLS policies in the Supabase SQL Editor:

```sql
-- Set session to act as a specific user
SELECT auth.uid(); -- Should return the user ID

-- Test viewing items
SELECT * FROM items; -- Should return your items + friends' items

-- Test viewing friend connections
SELECT * FROM friend_connections; -- Should return connections involving you

-- Test viewing borrow requests
SELECT * FROM borrow_requests; -- Should return requests you sent or received
```

---

## Modifying Policies

If you need to modify policies in the future:

1. Create a new migration file (e.g., `012_update_policies.sql`)
2. Drop the old policy: `DROP POLICY IF EXISTS "policy_name" ON table_name;`
3. Create the new policy with updated logic
4. Test thoroughly before deploying to production

**Template**:
```sql
DROP POLICY IF EXISTS "policy_name" ON table_name;

CREATE POLICY "policy_name"
  ON table_name
  FOR SELECT -- or INSERT, UPDATE, DELETE, ALL
  USING (
    -- Condition that must be true for row to be visible/modifiable
    auth.uid() = user_id
  );
```

---

## Performance Considerations

RLS policies are evaluated on every query, so complex policies can impact performance:

- ✅ **Good**: Simple equality checks (`auth.uid() = user_id`)
- ⚠️ **Moderate**: EXISTS subqueries (used for friends' items)
- ❌ **Slow**: Complex joins or multiple subqueries

**Optimization Tips**:
- Keep policies simple
- Use indexes on columns referenced in policies
- Consider materialized views for complex access patterns

Current indexes that support RLS policies:
- `idx_items_user_id` - For items table
- `idx_friend_connections_user_id` - For friend connections
- `idx_borrow_requests_owner_id` - For borrow requests

---

## Verification

After running migrations, verify policies are correct:

```sql
-- List all policies
SELECT schemaname, tablename, policyname, permissive, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Test specific policy
SET ROLE authenticated;
SELECT * FROM items WHERE user_id = 'some-user-id';
```

---

## Migration History

- **001_initial_schema.sql** - Created tables with RLS enabled (policies commented out)
- **009_borrow_requests.sql** - Added borrow_requests table with basic policies
- **010_items_rls_policies.sql** - Added items table policies (superseded by 011)
- **011_comprehensive_rls_policies.sql** - Complete RLS policy overhaul for all tables
- **021_borrow_history_open_read.sql** - Opened borrow_history to all signed-in users (reverted by 049)
- **049_privacy_rls.sql** - Own-row-only users, public_profiles, search functions, owner/borrower-only history, security_invoker views ✅
