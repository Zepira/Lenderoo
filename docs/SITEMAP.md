# Lenderoo — Site Map & Data Flow

Navigation routes, database calls, and table relationships for every screen.

---

## Database Tables

| Table | Purpose |
|---|---|
| `users` | User profiles — id, email, name, avatar_url, friend_code |
| `items` | Library items — id, user_id, name, category, images, borrowed_by, borrowed_date, due_date, returned_date, metadata |
| `friend_connections` | User-to-user friendships — user_id, friend_user_id, status (pending / active) |
| `borrow_requests` | Borrow and queue requests — item_id, requester_id, owner_id, status (pending / approved / denied / cancelled) |
| `borrow_history` | Completed borrow records — item_id, friend_id, borrowed_date, returned_date |
| `feedback` | In-app feedback submissions |

**Views**

| View | Joins |
|---|---|
| `user_friends` | friend_connections + users — returns friends with display info |
| `borrow_requests_with_details` | borrow_requests + items + users (requester) + users (owner) |
| `borrow_history_with_users` | borrow_history + users — returns history with borrower names/avatars |

**Storage Buckets**

| Bucket | Purpose |
|---|---|
| `avatars` | User profile images |
| `item-images` | Item photos |

---

## Navigation Structure

```
/ (root)
├── (auth)/                         Not authenticated
│   ├── index                       Welcome screen
│   ├── sign-in
│   ├── sign-up
│   └── forgot-password
│
└── (tabs)/                         Authenticated
    ├── index                       Home / Dashboard
    ├── library/                    My Library
    │   └── index
    ├── explore                     (stub)
    ├── settings
    └── friends/
        ├── index                   Friends list
        ├── [id]                    Friend detail
        └── add-user-friend

/item/[id]                          Item detail (modal stack)
/add-item/                          Add item flow (modal stack)
│   ├── index                       Pick category
│   ├── search                      Book search
│   ├── book                        Add book form
│   └── generic                     Add generic item form
/edit-item/[id]                     Edit item router (modal stack)
│   ├── book                        Edit book form
│   └── generic                     Edit generic item form
/profile                            Edit profile
```

---

## Screen Reference

### Auth Screens

---

#### `/` — Welcome
**DB calls:** none  
**Navigates to:** `/sign-in`, `/sign-up`

---

#### `/sign-in` — Sign In
**DB calls:**

| Call | Table | Operation |
|---|---|---|
| `supabase.auth.signInWithPassword()` | auth | SELECT (verify credentials) |

**Navigates to:** `/(tabs)` on success · `/sign-up` · `/forgot-password`

---

#### `/sign-up` — Sign Up
**DB calls:**

| Call | Table | Operation |
|---|---|---|
| `supabase.auth.signUp()` | auth | INSERT |
| Profile creation (trigger) | `users` | INSERT (server-side trigger) |

**Navigates to:** `/(tabs)` on success · `/sign-in`

---

#### `/forgot-password` — Password Reset
**DB calls:**

| Call | Table | Operation |
|---|---|---|
| `supabase.auth.resetPasswordForEmail()` | auth | (email dispatch) |

**Navigates to:** `/sign-in`

---

### Tab Screens

---

#### `/(tabs)` — Home / Dashboard
**DB calls (on focus):**

| Call | Table | Operation |
|---|---|---|
| `getActiveItems()` | `items` | SELECT where borrowed_by NOT NULL, returned_date IS NULL |
| `getBorrowedByMeItems()` | `items` | SELECT where borrowed_by = currentUser |
| `queryItems()` | `items` | SELECT all (for stats) |

**Navigates to:** `/item/{id}` on item tap · `/(tabs)/library`

---

#### `/(tabs)/library` — My Library
**DB calls (on focus):**

| Call | Table | Operation |
|---|---|---|
| `queryItems(filter)` | `items` | SELECT filtered by status (all / available / lent) |
| `getIncomingBorrowRequests()` | `borrow_requests_with_details` | SELECT where owner_id = me, status = pending |

**Interactions:**

| Action | Call | Table | Operation |
|---|---|---|---|
| Approve request | `approveBorrowRequest(id)` | `borrow_requests`, `items` | UPDATE status → approved; if item available also UPDATE item.borrowed_by |
| Deny request | `denyBorrowRequest(id)` | `borrow_requests` | UPDATE status → denied |

**Realtime:** Subscribes to `borrow_requests` (owner_id = me) — reloads on any change  
**Navigates to:** `/item/{id}` on item tap · `/add-item`

---

#### `/(tabs)/explore` — Explore
**DB calls:** none (stub screen)

---

#### `/(tabs)/settings` — Profile & Settings
**DB calls (on load):**

| Call | Table | Operation |
|---|---|---|
| `useAuth` (AuthContext) | auth / `users` | SELECT current user |

**Interactions:**

| Action | Call | Table | Operation |
|---|---|---|---|
| Change avatar | `uploadAvatarImage()` | storage: `avatars` | INSERT |
| Update profile | `supabase.auth.updateUser()` | auth | UPDATE |
| Sign out | `supabase.auth.signOut()` | auth | DELETE session |

**Navigates to:** `/(tabs)/friends` · `/profile`

---

#### `/(tabs)/friends` — Friends List
**DB calls (on focus):**

| Call | Table | Operation |
|---|---|---|
| `getMyFriends()` | `user_friends` (view) | SELECT |
| `getPendingFriendRequests()` | `friend_connections`, `users` | SELECT where friend_user_id = me, status = pending |
| `getFriendItemCounts(id)` (per friend) | `items` | SELECT COUNT owned + borrowed |

**Interactions:**

| Action | Call | Table | Operation |
|---|---|---|---|
| Approve friend request | `approveFriendRequest(id)` | `friend_connections` | UPDATE status → active + INSERT reciprocal row |
| Deny friend request | `denyFriendRequest(id)` | `friend_connections` | DELETE |

**Realtime:** Subscribes to `friend_connections` — reloads on change  
**Navigates to:** `/friends/{id}` on tap · `/(tabs)/friends/add-user-friend`

---

#### `/(tabs)/friends/add-user-friend` — Add Friend
**DB calls (on load):**

| Call | Table | Operation |
|---|---|---|
| `getMyFriendCode()` | `users` | SELECT friend_code |

**Interactions:**

| Action | Call | Table | Operation |
|---|---|---|---|
| Regenerate code | `regenerateFriendCode()` | `users` | RPC → UPDATE friend_code |
| Add by code | `addFriendByCode(code)` | `users`, `friend_connections` | SELECT user by code → INSERT pending connection |
| Search users | `searchUsers(query)` | `users` | SELECT ilike name/email |
| Add from search | `addFriendByUserId(id)` | `friend_connections` | INSERT pending connection |

**Navigates to:** back on success

---

#### `/(tabs)/friends/[id]` — Friend Detail
**DB calls (on focus):**

| Call | Table | Operation |
|---|---|---|
| `getFriendUserById(id)` | `user_friends` (view) | SELECT |
| `getItemsBorrowedByFriend(id)` | `items` | SELECT where user_id = me AND borrowed_by = friend |
| `getItemsOwnedByFriend(id)` | `items` | SELECT where user_id = friend |
| `getMyBorrowRequestForItem(itemId)` (per owned item) | `borrow_requests` | SELECT where requester_id = me, status IN [pending, approved] |

**Interactions:**

| Action | Call | Table | Operation |
|---|---|---|---|
| Borrow / Request Next | `createBorrowRequest(itemId, ownerId)` | `user_friends`, `items`, `borrow_requests` | SELECT (verify friendship) → INSERT pending request |
| Cancel request | `cancelBorrowRequest(id)` | `borrow_requests` | UPDATE status → cancelled |
| Return item | `markItemReturned(itemId)` | `items`, `borrow_history`, `borrow_requests` | UPDATE item (clear borrowed_by) → INSERT history → UPDATE requests → cancelled |
| Remove friend | `removeFriend(id)` | `friend_connections` | DELETE both sides |

**Realtime:** Subscribes to `items` (borrowed from me + friend-owned) and `borrow_requests` for this friend  
**Navigates to:** `/item/{id}` on item tap · back

---

### Modal / Detail Screens

---

#### `/item/[id]` — Item Detail
**DB calls (on focus):**

| Call | Table | Operation |
|---|---|---|
| `getItemById(id)` | `items` | SELECT |
| `getHistoryForItemWithUsers(id)` | `borrow_history_with_users` (view) | SELECT |
| `getMyBorrowRequestForItem(id)` | `borrow_requests` | SELECT (non-owner viewer) |
| `getApprovedQueueForItem(id, borrowerId)` | `borrow_requests_with_details` | SELECT status = approved, excludes current borrower |
| `getUserPublicProfile(borrowerUserId)` | `users` | SELECT (borrower info for non-friend borrowers) |

**Interactions — Owner:**

| Action | Call | Table | Operation |
|---|---|---|---|
| Lend to friend | `updateItem(id, {borrowedBy})` | `items` | UPDATE borrowed_by, borrowed_date |
| Mark returned | `markItemReturned(id)` | `items`, `borrow_history`, `borrow_requests` | UPDATE item → INSERT history → UPDATE requests → cancelled |
| Hand off to next (queue) | `markItemReturnedToNext(id, nextId)` | `items`, `borrow_history`, `borrow_requests` | UPDATE item.borrowed_by → next person → INSERT history → cancel other requests |
| Edit | — | — | Navigates to `/edit-item/{id}` |
| Delete | `deleteItem(id)` | `items`, storage: `item-images` | DELETE item + images |

**Interactions — Borrower:**

| Action | Call | Table | Operation |
|---|---|---|---|
| Return to owner | `markItemReturned(id)` | `items`, `borrow_history`, `borrow_requests` | UPDATE + INSERT (same as owner path) |
| Hand off to next (queue) | `markItemReturnedToNext(id, nextId)` | `items`, `borrow_history`, `borrow_requests` | UPDATE + INSERT |

**Interactions — Friend (viewer):**

| Action | Call | Table | Operation |
|---|---|---|---|
| Borrow (item available) | `createBorrowRequest(itemId, ownerId)` | `user_friends`, `items`, `borrow_requests` | SELECT verify friendship → INSERT pending |
| Request Next (item unavailable) | `createBorrowRequest(itemId, ownerId)` | `user_friends`, `items`, `borrow_requests` | Same — no longer blocked by item being borrowed |
| Cancel Request | `cancelBorrowRequest(id)` | `borrow_requests` | UPDATE → cancelled |
| Leave Queue (approved) | `cancelBorrowRequest(id)` | `borrow_requests` | UPDATE → cancelled |

**Navigates to:** `/edit-item/{id}` · `/friends/{id}` (if borrower is a friend) · back

---

#### `/add-item` — Add Item (Category Picker)
**DB calls:** none  
**Navigates to:** `/add-item/search` (books) · `/add-item/generic?category={x}` (other)

---

#### `/add-item/search` — Book Search
**DB calls:**

| Call | Table | Operation |
|---|---|---|
| Hardcover API / Edge Function | external | GraphQL search |

**Navigates to:** `/add-item/book?{bookData}` on selection

---

#### `/add-item/book` — Add Book
**DB calls:**

| Call | Table | Operation |
|---|---|---|
| `createItem(data)` | `items` | INSERT with book metadata |
| `uploadItemImage(uri)` | storage: `item-images` | INSERT (cover image) |

**Navigates to:** back / close modal on success

---

#### `/add-item/generic` — Add Generic Item
**DB calls:**

| Call | Table | Operation |
|---|---|---|
| `createItem(data)` | `items` | INSERT |
| `uploadItemImage(uri)` (if image selected) | storage: `item-images` | INSERT |

**Navigates to:** back / close modal on success

---

#### `/edit-item/[id]` — Edit Item Router
**DB calls:**

| Call | Table | Operation |
|---|---|---|
| `getItemById(id)` | `items` | SELECT (to determine category) |

**Navigates to:** `/edit-item/book?itemId={id}` or `/edit-item/generic?itemId={id}&category={x}`

---

#### `/edit-item/book` — Edit Book
**DB calls:**

| Call | Table | Operation |
|---|---|---|
| `updateItem(id, data)` | `items` | UPDATE |
| `uploadItemImage(uri)` (if changed) | storage: `item-images` | INSERT + DELETE old |

**Navigates to:** back on success

---

#### `/edit-item/generic` — Edit Generic Item
**DB calls:**

| Call | Table | Operation |
|---|---|---|
| `updateItem(id, data)` | `items` | UPDATE |
| `uploadItemImage(uri)` (if changed) | storage: `item-images` | INSERT + DELETE old |

**Navigates to:** back on success

---

#### `/profile` — Edit Profile
**DB calls:**

| Call | Table | Operation |
|---|---|---|
| `supabase.auth.updateUser({email})` | auth | UPDATE (sends confirmation email) |
| `supabase.auth.updateUser({password})` | auth | UPDATE |
| `supabase.auth.signInWithPassword()` | auth | SELECT (verify current password) |

**Navigates to:** back

---

## Service → Table Reference

### database-supabase.ts

| Function | Tables | Operation |
|---|---|---|
| `getAllItems()` | `items` | SELECT |
| `getItemById(id)` | `items` | SELECT single |
| `createItem(data)` | `items` | INSERT |
| `updateItem(id, updates)` | `items` | UPDATE |
| `deleteItem(id)` | `items`, storage: `item-images` | DELETE |
| `getItemsByFriend(friendId)` | `items` | SELECT |
| `getActiveItems()` | `items` | SELECT (borrowed_by NOT NULL, returned_date IS NULL) |
| `getAvailableItems()` | `items` | SELECT (borrowed_by IS NULL) |
| `getOverdueItems()` | `items` | SELECT (due_date < now) |
| `getBorrowedByMeItems()` | `items` | SELECT (borrowed_by = me, user_id ≠ me) |
| `queryItems(filters)` | `items` | SELECT with filters |
| `markItemReturned(id)` | `items`, `borrow_history`, `borrow_requests` | UPDATE + INSERT + UPDATE |
| `markItemReturnedToNext(id, nextId)` | `items`, `borrow_history`, `borrow_requests` | UPDATE + INSERT + UPDATE |
| `getHistoryForItemWithUsers(id)` | `borrow_history_with_users` | SELECT |
| `addHistoryEntry(entry)` | `borrow_history` | INSERT |
| `closeOpenHistoryEntry(id, borrowerId)` | `borrow_history` | UPDATE (set returned_date) |
| `clearAllData()` | `items` | DELETE all owned |
| `exportData()` | `items`, `borrow_history` | SELECT |
| `importData(data)` | `items`, `borrow_history` | INSERT bulk |

### borrow-requests-service.ts

| Function | Tables | Operation |
|---|---|---|
| `createBorrowRequest(itemId, ownerId)` | `user_friends`, `items`, `borrow_requests` | SELECT × 2 → INSERT |
| `getIncomingBorrowRequests()` | `borrow_requests_with_details` | SELECT (owner = me, pending) |
| `getOutgoingBorrowRequests()` | `borrow_requests_with_details` | SELECT (requester = me, pending/approved/denied) |
| `getBorrowRequestsForItem(itemId)` | `borrow_requests_with_details` | SELECT all statuses |
| `getMyBorrowRequestForItem(itemId)` | `borrow_requests` | SELECT (requester = me, pending/approved) |
| `getIncomingRequestCount()` | `borrow_requests` | SELECT COUNT |
| `getApprovedQueueForItem(itemId, borrowerId?)` | `borrow_requests_with_details` | SELECT (approved, excludes borrower) |
| `approveBorrowRequest(id, dueDate?)` | `borrow_requests`, `items` | UPDATE request → approved; if available: UPDATE item + deny others |
| `denyBorrowRequest(id)` | `borrow_requests` | UPDATE → denied |
| `cancelBorrowRequest(id)` | `borrow_requests` | UPDATE → cancelled |

### friends-service.ts

| Function | Tables | Operation |
|---|---|---|
| `getMyFriendCode()` | `users` | SELECT |
| `regenerateFriendCode()` | `users` | RPC + UPDATE |
| `addFriendByCode(code)` | `users`, `friend_connections` | SELECT → INSERT |
| `searchUsers(query)` | `users`, `friend_connections` | SELECT |
| `addFriendByUserId(id)` | `friend_connections` | INSERT |
| `getMyFriends()` | `user_friends` | SELECT |
| `getFriendUserById(id)` | `user_friends` | SELECT single |
| `getUserPublicProfile(id)` | `users` | SELECT (open read) |
| `getItemsBorrowedByFriend(id)` | `items` | SELECT |
| `getItemsOwnedByFriend(id)` | `items` | SELECT |
| `getFriendItemCounts(id)` | `items` | SELECT COUNT × 2 |
| `getPendingFriendRequests()` | `friend_connections`, `users` | SELECT |
| `approveFriendRequest(id)` | `friend_connections` | UPDATE + INSERT reciprocal |
| `denyFriendRequest(id)` | `friend_connections` | DELETE |
| `removeFriend(id)` | `friend_connections` | DELETE both sides |

### storage-service.ts / avatar-service.ts

| Function | Bucket | Operation |
|---|---|---|
| `uploadItemImage(uri, userId)` | `item-images` | INSERT |
| `uploadItemImages(uris, userId)` | `item-images` | INSERT × n |
| `deleteItemImage(url)` | `item-images` | DELETE |
| `uploadAvatarImage(userId, uri)` | `avatars` | INSERT |

### feedback-service.ts

| Function | Tables | Operation |
|---|---|---|
| `submitFeedback(comment)` | `feedback` | INSERT (with device info) |
| `getUserFeedback()` | `feedback` | SELECT |

---

## Realtime Subscriptions

| Channel | Table | Filter | Used By |
|---|---|---|---|
| `rt-items` | `items` | none (own items via RLS) | `useRealtimeSync` (global) |
| `rt-friends` | `friend_connections` | none (own via RLS) | `useRealtimeSync` (global) |
| `rt-borrow-requests` | `borrow_requests` | none (own via RLS) | `useRealtimeSync` (global) |
| `borrow-requests-library` | `borrow_requests` | owner_id = me | Library screen (local) |
| `friend-connections-changes` | `friend_connections` | user_id = me OR friend_user_id = me | Friends list (local) |
| `friend-{id}-borrowed-items` | `items` | borrowed_by = friendId | Friend detail (local) |
| `friend-{id}-owned-items` | `items` | user_id = friendId | Friend detail (local) |
| `friend-{id}-borrow-requests` | `borrow_requests` | item_id IN friend's items | Friend detail (local) |

---

## Item & Request Status States

**Item status** (derived, not stored):

```
available   → borrowed_by IS NULL, returned_date IS NULL
borrowed    → borrowed_by NOT NULL, returned_date IS NULL, due_date IS NULL or in future
overdue     → borrowed_by NOT NULL, returned_date IS NULL, due_date < now
```

**Borrow request status** (stored in borrow_requests.status):

```
pending   → waiting for owner approval
approved  → owner approved
            • item was available at approval time → item.borrowed_by is now set (active borrow)
            • item was already borrowed at approval time → queue position (next in line)
denied    → owner denied
cancelled → requester withdrew, or auto-cancelled when item was returned
```

---

## RLS Policy Summary

| Table | Who can SELECT | Who can INSERT | Who can UPDATE | Who can DELETE |
|---|---|---|---|---|
| `users` | Any authenticated user (migration 005) | Auth trigger only | Own row only | — |
| `items` | Owner (user_id = me), borrower (borrowed_by = me) | Owner | Owner, borrower (return only, migration 015/017) | Owner |
| `friend_connections` | Parties to the connection | Any authenticated (to send requests) | Recipient (accept/reject) | Parties to the connection |
| `borrow_requests` | Owner or requester of the request; borrower of the item (migrations 019, 023) | Requester (with friendship check) | Owner (approve/deny), requester (cancel) | — |
| `borrow_history` | Item owner and borrower (migration 020/021) | Owner (via markItemReturned) | Borrower (migration 022) | — |
| `feedback` | Own rows only | Any authenticated | — | — |
| `user_friends` view | Rows where user_id = me | — | — | — |
| `borrow_requests_with_details` view | Same as borrow_requests (security_invoker = true) | — | — | — |
