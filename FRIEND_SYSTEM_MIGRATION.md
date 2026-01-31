# Friend System Migration Summary

## Changes Made

### 1. Database Changes
**File: `supabase/migrations/008_update_items_borrowed_by_users.sql`**

- Changed `items.borrowed_by` to reference `users` table instead of `friends` table
- Updated `items_with_friends` view to join with users
- This enables lending items to user-friends (not just contact friends)

**Action Required:** Run this migration in Supabase SQL Editor

```sql
-- Drop the old foreign key constraint
ALTER TABLE public.items
  DROP CONSTRAINT IF EXISTS items_borrowed_by_fkey;

-- Add new foreign key constraint to users table
ALTER TABLE public.items
  ADD CONSTRAINT items_borrowed_by_fkey
  FOREIGN KEY (borrowed_by)
  REFERENCES public.users(id)
  ON DELETE SET NULL;

-- Update the items_with_friends view
CREATE OR REPLACE VIEW public.items_with_friends AS
SELECT
  i.*,
  u.name as friend_name,
  u.email as friend_email,
  '' as friend_phone
FROM public.items i
LEFT JOIN public.users u ON i.borrowed_by = u.id;

GRANT SELECT ON public.items_with_friends TO authenticated;
```

### 2. New Functions in `lib/friends-service.ts`

Added two new functions to support the friend detail page:

- `getFriendUserById(friendUserId)` - Gets a friend's user details
- `getItemsBorrowedByFriend(friendUserId)` - Gets items borrowed by a friend

### 3. Updated Friend Detail Page
**File: `app/(tabs)/friends/[id].tsx`**

- Now uses the new user-friend system instead of old contacts system
- Fetches friend data from `users` table via `friend_connections`
- Calculates statistics from actual borrowed items
- Shows correct active and total item counts
- Fixed delete functionality to work with user-friends

## How It Works Now

### Lending to Friends
1. User A and User B become friends via friend request
2. User A can lend an item to User B
3. When lending, `items.borrowed_by` is set to User B's ID
4. User A can see the item in User B's friend detail page
5. Statistics are calculated from actual borrowed items

### Friend Detail Page
- Click on a friend from the friends list
- See their profile (name, email, avatar)
- See statistics:
  - **Currently Borrowed**: Count of unreturned items
  - **Total Borrowed**: Count of all items ever borrowed
- View list of currently borrowed items
- View list of previously borrowed items
- Remove friend (only if no active borrows)

## Known Limitations

### Friend List Item Counts
The friend cards on the main friends list show 0 for item counts. This is because:
- The `FriendUser` type doesn't include borrow counts
- Calculating counts for all friends would require multiple queries
- **Solution**: These counts are accurate on the detail page

To fix this later, you could:
1. Create a materialized view that caches these counts
2. Add a trigger to update counts when items change
3. Or fetch counts client-side (may be slow with many friends)

### Two Friend Systems
The app now has two friend systems:
1. **Old**: `friends` table - for non-user contacts (still exists but not used for borrowing)
2. **New**: `friend_connections` table - for user-to-user friendships (active system)

Items can only be borrowed by user-friends (from `users` table), not contact friends.

## Testing Checklist

- [ ] Run migration 008 in Supabase
- [ ] Run migration 007 (realtime) if not already done
- [ ] Run migration 006 (RLS policies) if not already done
- [ ] Send friend request between two users
- [ ] Accept friend request
- [ ] Lend an item to the friend (set `borrowed_by` to their user ID)
- [ ] Visit friend detail page - should show 1 currently borrowed item
- [ ] Check that statistics are correct
- [ ] Mark item as returned - should update to 0 current, 1 total
- [ ] Try to remove friend with active borrows - should be blocked
- [ ] Mark all items as returned - should be able to remove friend

## Next Steps

If you want item counts on the friend list cards:
1. Create a database function to calculate counts
2. Create a view that includes these counts
3. Update `getMyFriends()` to use this view
4. Update the friend conversion function to include these counts
