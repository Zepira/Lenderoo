# Running the Borrow Requests Migration

## Quick Start

To enable the borrow request feature, you need to run TWO database migrations.

**Note:** Migration 011 includes and replaces migration 010, so you only need to run 009 and 011.

### Step 1: Open Supabase Dashboard

1. Go to https://supabase.com and sign in
2. Select your Lenderoo project
3. Click on **SQL Editor** in the left sidebar

### Step 2: Run Borrow Requests Migration

1. Click **"New Query"** button
2. Open the file: `supabase/migrations/009_borrow_requests.sql`
3. Copy the entire contents (Ctrl+A, Ctrl+C)
4. Paste into the SQL Editor
5. Click **"Run"** or press Ctrl+Enter

### Step 3: Run Comprehensive RLS Policies Migration ⚠️ CRITICAL

**This step is REQUIRED for the entire app to work properly!**

This migration sets up all Row Level Security policies across all tables to prevent permission errors.

1. Click **"New Query"** button again
2. Open the file: `supabase/migrations/011_comprehensive_rls_policies.sql`
3. Copy the entire contents
4. Paste into the SQL Editor
5. Click **"Run"** or press Ctrl+Enter

This migration sets up proper permissions for:
- ✅ **Users table** - View all user profiles (needed for friend discovery)
- ✅ **Friend connections** - Full CRUD for your connections
- ✅ **Items table** - View own items + friends' items
- ✅ **Borrow requests** - Create requests, approve/deny, cancel
- ✅ **Borrow history** - View your item history

**Why is this needed?**
RLS is enabled on all tables but many policies were missing or too restrictive, causing queries to fail even though data exists in the database.

### Step 3: Verify Migration

After running the migration, verify it was successful:

1. Go to **Table Editor** in the left sidebar
2. You should see a new table: `borrow_requests`
3. Click on the table to verify it has the following columns:
   - id
   - item_id
   - requester_id
   - owner_id
   - status
   - requested_due_date
   - message
   - created_at
   - updated_at

### Step 4: Verify View

1. Go back to **SQL Editor**
2. Run this query to verify the view was created:
   ```sql
   SELECT * FROM borrow_requests_with_details LIMIT 1;
   ```
3. It should run without errors (may return 0 rows if no requests exist yet)

### Step 5: Verify Realtime

1. Go to **Database** → **Replication** in the left sidebar
2. Verify that `borrow_requests` table is listed under "Realtime"
3. If not, run this query in SQL Editor:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE borrow_requests;
   ```

## What This Migration Creates

The migration creates:

✅ **`borrow_requests` table** - Stores all borrow requests
✅ **Indexes** - For efficient querying on item_id, requester_id, owner_id, status
✅ **RLS Policies** - Secure access (users can only see their own requests)
✅ **UNIQUE Constraint** - Prevents duplicate pending requests
✅ **Triggers** - Auto-updates `updated_at` timestamp
✅ **View** - `borrow_requests_with_details` joins with items and users
✅ **Realtime** - Enables real-time subscriptions for live updates

## Troubleshooting

### Error: "relation 'items' does not exist"

This means your database doesn't have the required tables. You need to run the earlier migrations first:

1. Go to `supabase/migrations/` folder
2. Run migrations in order:
   - `001_initial_schema.sql`
   - `002_friend_connections.sql`
   - ... (any other migrations before 009)
   - `009_borrow_requests.sql`

### Error: "permission denied"

Make sure you're using the SQL Editor with the service_role key, not running as a regular user.

### View doesn't work

If the view returns errors, drop and recreate it:

```sql
DROP VIEW IF EXISTS borrow_requests_with_details;

-- Then re-run the CREATE VIEW statement from the migration
```

### Realtime not working

Verify realtime is enabled:

```sql
-- Check if table is in realtime publication
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';

-- If borrow_requests is not listed, add it:
ALTER PUBLICATION supabase_realtime ADD TABLE borrow_requests;
```

## Testing After Migration

Once the migration is complete, test the feature:

1. **Start your Expo app**:
   ```bash
   yarn start
   ```

2. **Sign in as two different users** (use two devices/browsers)

3. **User A adds an item** to their library

4. **User B views User A's friend profile**
   - Should see "Their Items" section
   - Should see User A's items with "Request to Borrow" button

5. **User B requests an item**
   - Click "Request to Borrow"
   - Should see success toast
   - Item status should change to "Request Pending"

6. **User A checks Library tab**
   - Should see banner at top: "1 Borrow Request"
   - Should see "Incoming Borrow Requests" section
   - Should see User B's request with Approve/Deny buttons

7. **User A approves the request**
   - Click "Approve"
   - Confirm in dialog
   - Item should move to "Lent Out" tab
   - Request should disappear
   - Banner should disappear (if no more requests)

8. **User B's view updates in real-time**
   - Item should now show as "Borrowed"
   - Should no longer be requestable

## Need Help?

If you encounter issues:

1. Check the **Logs** in Supabase Dashboard (Database → Logs)
2. Check browser console for errors
3. Verify your `.env` file has correct Supabase credentials
4. Review the full implementation docs in `BORROW_REQUESTS_IMPLEMENTATION.md`

## Rollback (if needed)

If you need to undo the migration:

```sql
-- Remove from realtime
ALTER PUBLICATION supabase_realtime DROP TABLE borrow_requests;

-- Drop the view
DROP VIEW IF EXISTS borrow_requests_with_details;

-- Drop the table (this will delete all borrow requests!)
DROP TABLE IF EXISTS borrow_requests;
```

**Warning**: Rolling back will permanently delete all borrow request data!
