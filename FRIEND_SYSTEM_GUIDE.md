# Friend System Implementation Guide

## Overview

A complete user-to-user friend system has been implemented with:
- ✅ Unique 6-character friend codes for each user
- ✅ Add friends by entering their code
- ✅ Search for users by name or email
- ✅ Copy/regenerate your friend code
- ✅ Bidirectional friendships
- ✅ Row-level security (RLS)

## What's Been Created

### 1. Database Migration
**File**: `supabase/migrations/002_friend_system.sql`

Creates:
- `friend_code` column in `users` table (unique 6-char code)
- `friend_connections` table (stores user-to-user friendships)
- Helper functions:
  - `generate_friend_code()` - Generates random 6-char code
  - `get_unique_friend_code()` - Ensures uniqueness
  - `add_friend_by_code()` - Adds friend via code (creates bidirectional friendship)
- View: `user_friends` - Shows friend details
- Automatic friend code generation on signup

### 2. Service Layer
**File**: `lib/friends-service.ts`

Functions:
- `getMyFriendCode()` - Get current user's friend code
- `regenerateFriendCode()` - Generate a new friend code
- `addFriendByCode(code)` - Add friend using their code
- `searchUsers(query)` - Search for users by name/email
- `addFriendByUserId(userId)` - Add friend after searching
- `getMyFriends()` - Get all friends
- `removeFriend(friendUserId)` - Remove a friend

### 3. UI Screen
**File**: `app/add-user-friend.tsx`

Features:
- **Your Friend Code** section:
  - Display your 6-character code
  - Copy button
  - Regenerate button
- **Two tabs**:
  - **Friend Code**: Enter 6-char code to add friend
  - **Search**: Search users by name/email
- Clean, responsive UI with dark mode support

### 4. Package Added
- `expo-clipboard` - For copying friend codes

## Deployment Steps

### Step 1: Deploy Database Migration

```bash
cd "D:\Repos\Personal Repos\Lenderoo\Lenderoo"

# Login to Supabase (if not already)
supabase login

# Link your project (if not already)
supabase link --project-ref ymboxvasluhlwgofrpya

# Deploy the new migration
supabase db push
```

**Or manually run the SQL:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/002_friend_system.sql`
3. Paste and run

### Step 2: Verify Database

After running the migration, verify in Supabase:

1. **Users table** should have `friend_code` column
2. **friend_connections** table should exist
3. Existing users should have friend codes generated
4. Try adding a friend via SQL:
   ```sql
   SELECT * FROM add_friend_by_code('ABC123');
   ```

### Step 3: Update Your App

The code is ready! Just navigate to the screen:

```typescript
// From anywhere in your app
import { router } from 'expo-router';

router.push('/add-user-friend');
```

Or add a button in your UI:
```tsx
<Button onPress={() => router.push('/add-user-friend')}>
  <UserPlus size={20} />
  <Text>Add Friend</Text>
</Button>
```

## How It Works

### Friend Code System

1. **Each user gets a unique 6-character code** (e.g., `ABC123`)
   - Auto-generated on signup
   - Excludes confusing characters (0, O, 1, I)
   - Can be regenerated anytime

2. **Adding Friends by Code**:
   ```
   User A (code: ABC123) → Shares code with User B
   User B → Enters "ABC123" → Both become friends
   ```

3. **Bidirectional Friendship**:
   - Creates TWO connections in database:
     - `user_id: B, friend_user_id: A`
     - `user_id: A, friend_user_id: B`
   - Both users see each other as friends

### Search System

1. User searches for "John" or "john@example.com"
2. Returns matching users (excluding self and existing friends)
3. Click "Add" to become friends
4. Same bidirectional connection created

## Usage Examples

### Example 1: Add Friend by Code

```typescript
import { addFriendByCode } from '@/lib/friends-service';

const result = await addFriendByCode('ABC123');
if (result.success) {
  console.log('Friend added!');
} else {
  console.log(result.message); // "Invalid friend code", "Already friends", etc.
}
```

### Example 2: Search and Add

```typescript
import { searchUsers, addFriendByUserId } from '@/lib/friends-service';

// Search
const users = await searchUsers('john');
// Returns: [{ id, name, email, friendCode, ... }]

// Add first result
await addFriendByUserId(users[0].id);
```

### Example 3: Get My Friends

```typescript
import { getMyFriends } from '@/lib/friends-service';

const friends = await getMyFriends();
// Returns: [{ id, name, email, avatarUrl, friendCode, friendsSince }]
```

## Security

### Row-Level Security (RLS)

All tables have RLS policies:

**Users table**:
- Users can read their own profile
- Users can update their own profile
- Friend codes are public (needed for adding friends)

**friend_connections table**:
- Users can only see their own friend connections
- Users can only create connections for themselves
- Users can update/delete their own connections

### Preventing Issues

- ✅ Can't add yourself as a friend
- ✅ Can't create duplicate friendships
- ✅ Friend codes are unique
- ✅ All operations validate authentication

## Testing

### Manual Testing

1. **Get your friend code**:
   - Open app → Settings → Should see your code
   - Or open `/add-user-friend` → See your code at top

2. **Test adding friend**:
   - Create a second test account
   - Copy first user's friend code
   - Login as second user
   - Go to Add Friend → Enter code
   - Should add successfully

3. **Test search**:
   - Search for your friend's name
   - Should appear in results
   - Click "Add"

4. **Test regenerate**:
   - Click "Regenerate" on your code
   - Should get a new code
   - Old code should no longer work

### SQL Testing

```sql
-- Check existing friend codes
SELECT id, name, email, friend_code FROM users;

-- Check friend connections
SELECT * FROM friend_connections;

-- View friends with details
SELECT * FROM user_friends;

-- Test adding friend by code
SELECT * FROM add_friend_by_code('ABC123');
```

## Integration with Existing System

The new friend system is **separate** from the existing `friends` table:

- **Old `friends` table**: Non-user contacts (just name/email/phone)
  - Used for `app/add-friend.tsx`
  - For tracking people who don't have accounts

- **New `friend_connections` table**: User-to-user friendships
  - Used for `app/add-user-friend.tsx`
  - For connecting with other app users

Both can coexist! You can have:
- Real user friends (from friend_connections)
- Contact-only friends (from friends table)

## Troubleshooting

### "Friend code not found"
- Migration not run
- User account not created properly
- Check: `SELECT friend_code FROM users WHERE id = auth.uid();`

### "Already friends"
- Friendship already exists
- Check: `SELECT * FROM friend_connections WHERE user_id = auth.uid();`

### "Not authenticated"
- User not logged in
- Check auth state in your app

### RLS Policy Errors
- Policies might not be set up correctly
- Run migration again
- Check Supabase Dashboard → Authentication → Policies

## Next Steps

### Optional Enhancements

1. **Friend Requests** (instead of instant friendship):
   - Add `status: 'pending'` | `'active'` | `'rejected'`
   - Require acceptance before showing as friend

2. **Notifications**:
   - Notify when someone adds you
   - Show pending friend requests

3. **Friend Management Screen**:
   - List all friends
   - Remove friends
   - View friend details

4. **Share Friend Code**:
   - Share via SMS, email, social media
   - Generate QR code for friend code

5. **Friend Privacy Settings**:
   - Make profile searchable or not
   - Control who can add you

## Summary

✅ **Database**: Migration ready to deploy
✅ **Backend**: Service functions created
✅ **Frontend**: Add Friend screen ready
✅ **Security**: RLS policies in place
✅ **Testing**: Ready to test after deployment

**Deploy the migration, then start using the friend system!** 🎉
