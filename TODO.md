# Lenderoo Development TODO

This document tracks all tasks needed to build Lenderoo, a cross-platform app for tracking items lent to friends.

## Legend
- [ ] Not started
- [x] Completed
- [~] In progress
- [!] Blocked/needs decision

---

## Phase 1: Foundation & Setup

### Project Configuration
- [x] Initialize project with Expo Router and Tamagui
- [x] Update app.json with Lenderoo branding
- [x] Update package.json with app info
- [x] Create comprehensive CLAUDE.md
- [x] Create comprehensive README.md
- [x] Create TODO.md roadmap
- [x] Add .env.example file with required environment variables
- [x] Create .gitignore entries for sensitive files
- [ ] Set up EAS configuration (eas.json)
- [ ] Configure app icons and splash screens

### Design & Planning
- [ ] Create wireframes for all main screens
- [ ] Define color palette and design system
- [ ] Create app icon design
- [ ] Create splash screen design
- [ ] Plan user flows (add item, lend item, return item, etc.)
- [ ] Design empty states for lists
- [ ] Design error states
- [ ] Design loading states

### Type Definitions
- [x] Create `lib/types.ts` with core interfaces
  - [x] Item interface
  - [x] Friend interface
  - [x] BorrowHistory interface
  - [x] User interface
  - [x] Category type
  - [x] ItemStatus type
- [x] Set up Zod for runtime validation

---

## Phase 2: Core UI Components

### Layout Components
- [ ] Create custom header component
- [ ] Create bottom tab navigator layout
- [ ] Create modal layout wrapper
- [ ] Update `app/_layout.tsx` with proper providers
- [ ] Create loading screen component

### Reusable Components
- [x] **ItemCard** - Display item summary
  - [x] Show item image (or placeholder)
  - [x] Show item name and category
  - [x] Show borrower name/avatar
  - [x] Show borrow date and due date
  - [x] Show overdue indicator
  - [x] Add press handler
- [x] **FriendCard** - Display friend summary
  - [x] Show friend avatar (or initials)
  - [x] Show friend name
  - [x] Show count of items currently borrowed
  - [x] Add press handler
- [x] **ItemList** - Scrollable list of items
  - [x] Implement FlatList with ItemCard
  - [x] Add pull-to-refresh
  - [x] Add filter/sort options
  - [x] Handle empty state
- [x] **FriendList** - Scrollable list of friends
  - [x] Implement FlatList with FriendCard
  - [x] Add pull-to-refresh
  - [x] Add search functionality
- [x] **EmptyState** - Generic empty state component
  - [x] Customizable icon
  - [x] Customizable message
  - [x] Optional action button
- [x] **CategoryBadge** - Visual category indicator
- [x] **StatusBadge** - Item status indicator (borrowed, returned, overdue)
- [x] **SearchBar** - Reusable search input
- [ ] **FilterSheet** - Bottom sheet for filtering/sorting
- [ ] **ImagePicker** - Custom image picker component
- [ ] **ConfirmDialog** - Confirmation modal
- [ ] **DatePicker** - Date selection component

---

## Phase 3: Navigation & Screens

### Tab Navigation
- [x] Update `app/(tabs)/_layout.tsx` with proper tabs
  - [x] Home/Items tab (list icon)
  - [x] Friends tab (users icon)
  - [x] Profile/Settings tab (user icon)
- [x] Add custom tab bar styling
- [x] Add active/inactive icons

### Home Screen (Items List)
- [x] Create/update `app/(tabs)/index.tsx`
- [x] Display list of currently borrowed items
- [x] Add floating action button (FAB) to add new item
- [ ] Implement filter by category
- [ ] Implement sort options (date, name, due date)
- [x] Add search functionality
- [x] Show overdue items with warning
- [x] Pull to refresh

### Friends Screen
- [x] Create `app/(tabs)/friends.tsx`
- [x] Display list of all friends
- [x] Show item count per friend
- [x] Add FAB to add new friend
- [x] Implement search
- [x] Alphabetical sorting
- [x] Pull to refresh

### Item Detail Screen
- [ ] Create `app/item/[id].tsx`
- [ ] Display full item details
  - [ ] Large image view
  - [ ] Item name (editable)
  - [ ] Description (editable)
  - [ ] Category selector
  - [ ] Borrowed by (friend selector)
  - [ ] Borrow date
  - [ ] Due date (optional)
  - [ ] Notes field
  - [ ] Creation/update timestamps
- [ ] Add "Mark as Returned" button
- [ ] Add "Edit" button
- [ ] Add "Delete" button with confirmation
- [ ] Show borrow history for this item
- [ ] Add image gallery support (multiple photos)

### Friend Detail Screen
- [ ] Create `app/friend/[id].tsx`
- [ ] Display friend information
  - [ ] Avatar (large)
  - [ ] Name (editable)
  - [ ] Email (editable)
  - [ ] Phone (editable)
- [ ] Show list of items currently borrowed
- [ ] Show borrow history
- [ ] Show statistics (total items borrowed, average return time)
- [ ] Add "Edit" button
- [ ] Add "Delete" button with confirmation
- [ ] Add "Send Reminder" button (future)

### Add Item Screen/Modal
- [x] Create `app/add-item.tsx` (modal)
- [x] Item name input (required)
- [x] Description textarea
- [x] Category selector
- [ ] Image picker (with camera option)
- [x] Friend selector (who's borrowing)
- [x] Borrow date picker (default today)
- [ ] Due date picker (optional)
- [x] Notes field
- [x] Save button
- [x] Cancel button
- [x] Form validation

### Add Friend Screen/Modal
- [x] Create `app/add-friend.tsx` (modal)
- [x] Name input (required)
- [x] Email input (optional)
- [x] Phone input (optional)
- [ ] Avatar picker (optional)
- [x] Save button
- [x] Cancel button
- [x] Form validation

### Settings/Profile Screen
- [x] Create `app/(tabs)/settings.tsx`
- [x] Display user profile info
- [x] Theme toggle (light/dark/system)
- [ ] Notification preferences
- [ ] Default reminder days before due date
- [x] Export data option
- [x] About/version info
- [ ] Sign out button (when auth is added)

### Other Screens
- [ ] Update `app/+not-found.tsx` with better design
- [ ] Create `app/search.tsx` for global search (optional)
- [ ] Create `app/history.tsx` for full borrow history (optional)

---

## Phase 4: Local Data Management (MVP)

### Storage Setup
- [x] Install @react-native-async-storage/async-storage
- [x] Create `lib/storage.ts` utility wrapper
- [x] Implement generic CRUD operations

### Data Services
- [x] Create `lib/database.ts` for local data management
  - [x] **Items Service**
    - [x] getAllItems()
    - [x] getItemById(id)
    - [x] createItem(item)
    - [x] updateItem(id, updates)
    - [x] deleteItem(id)
    - [x] getItemsByFriend(friendId)
    - [x] getActiveItems() (not returned)
    - [x] getOverdueItems()
  - [x] **Friends Service**
    - [x] getAllFriends()
    - [x] getFriendById(id)
    - [x] createFriend(friend)
    - [x] updateFriend(id, updates)
    - [x] deleteFriend(id)
    - [x] getFriendStats(id)
  - [x] **History Service**
    - [x] getBorrowHistory(itemId or friendId)
    - [x] addHistoryEntry(entry)
  - [x] **Demo Data**
    - [x] seedDemoData() - populate with sample data

### React Hooks
- [x] Create `hooks/useItems.ts`
  - [x] useItems() - get all items
  - [x] useItem(id) - get single item
  - [x] useActiveItems() - get unreturned items
  - [x] useOverdueItems() - get overdue items
  - [x] useCreateItem() - mutation hook
  - [x] useUpdateItem() - mutation hook
  - [x] useDeleteItem() - mutation hook
  - [x] useMarkItemReturned() - mutation hook
- [x] Create `hooks/useFriends.ts`
  - [x] useFriends() - get all friends
  - [x] useFriend(id) - get single friend
  - [x] useFriendItems(friendId) - get items for friend
  - [x] useCreateFriend() - mutation hook
  - [x] useUpdateFriend() - mutation hook
  - [x] useDeleteFriend() - mutation hook
- [ ] Create `hooks/useSearch.ts`
  - [ ] useSearchItems(query)
  - [ ] useSearchFriends(query)

---

## Phase 5: Image Handling

### Image Features
- [ ] Install expo-image-picker
- [ ] Install expo-image-manipulator
- [ ] Create `lib/images.ts` utilities
  - [ ] pickImage() - from gallery
  - [ ] takePicture() - from camera
  - [ ] compressImage() - reduce file size
  - [ ] resizeImage() - resize for upload
  - [ ] saveImageLocally() - save to local storage
  - [ ] deleteImageLocally() - cleanup
- [ ] Implement image preview component
- [ ] Implement image gallery component
- [ ] Add placeholder images for items without photos
- [ ] Optimize image loading with caching

---

## Phase 6: Search & Filtering

### Search Implementation
- [ ] Implement fuzzy search for items (by name, description, category)
- [ ] Implement search for friends (by name, email)
- [ ] Add search history
- [ ] Add recent searches
- [ ] Debounce search input

### Filtering & Sorting
- [ ] Filter items by category
- [ ] Filter items by friend
- [ ] Filter items by status (active, returned, overdue)
- [ ] Sort items by date (newest/oldest)
- [ ] Sort items by name (A-Z, Z-A)
- [ ] Sort items by due date
- [ ] Sort friends alphabetically
- [ ] Save filter/sort preferences

---

## Phase 7: Notifications & Reminders

### Local Notifications
- [ ] Install expo-notifications
- [ ] Request notification permissions
- [ ] Create `lib/notifications.ts`
  - [ ] scheduleReminder(itemId, dueDate)
  - [ ] cancelReminder(itemId)
  - [ ] scheduleOverdueNotification(itemId)
  - [ ] sendImmediateNotification(title, body)
- [ ] Set up notification listeners
- [ ] Handle notification taps (deep linking)
- [ ] Schedule reminders when item due date is set
- [ ] Schedule daily check for overdue items
- [ ] Add notification preferences in settings
- [ ] Allow custom reminder timing (1 day before, 3 days before, etc.)

---

## Phase 8: Authentication Setup

### Choose Auth Provider
- [!] Decision: Clerk vs Supabase Auth vs Firebase Auth
  - Clerk: Easiest, best DX, built-in UI
  - Supabase: Integrates with database, more control
  - Firebase: Popular, well-documented

### Implementation (Clerk Example)
- [ ] Install @clerk/clerk-expo
- [ ] Set up Clerk project and get API keys
- [ ] Add environment variables to .env
- [ ] Wrap app with ClerkProvider in `app/_layout.tsx`
- [ ] Create `lib/auth.ts` utilities
- [ ] Create `hooks/useAuth.ts`

### Auth Screens
- [ ] Create `app/(auth)/_layout.tsx` (public layout)
- [ ] Create `app/(auth)/sign-in.tsx`
  - [ ] Email/password form
  - [ ] Social sign-in options (Google, Apple)
  - [ ] "Forgot password" link
  - [ ] "Sign up" link
- [ ] Create `app/(auth)/sign-up.tsx`
  - [ ] Name input
  - [ ] Email input
  - [ ] Password input
  - [ ] Confirm password
  - [ ] Terms of service checkbox
  - [ ] "Sign in" link
- [ ] Create `app/(auth)/forgot-password.tsx`

### Protected Routes
- [ ] Implement route protection middleware
- [ ] Redirect unauthenticated users to sign-in
- [ ] Show loading state during auth check
- [ ] Handle auth state changes

### User Profile
- [ ] Store user ID with all data (items, friends)
- [ ] Create user profile screen
- [ ] Allow profile updates (name, email, avatar)
- [ ] Implement sign-out functionality
- [ ] Handle account deletion

---

## Phase 9: Backend Setup (Supabase)

### Supabase Project Setup
- [ ] Create Supabase project
- [ ] Get project URL and anon key
- [ ] Add to environment variables
- [ ] Install @supabase/supabase-js
- [ ] Create `lib/supabase.ts` client

### Database Schema
- [ ] Create `users` table (if not using Supabase Auth default)
  - [ ] id (uuid, primary key)
  - [ ] email (text, unique)
  - [ ] name (text)
  - [ ] avatar_url (text)
  - [ ] created_at (timestamp)
  - [ ] updated_at (timestamp)
- [ ] Create `friends` table
  - [ ] id (uuid, primary key)
  - [ ] user_id (uuid, foreign key → users)
  - [ ] name (text, required)
  - [ ] email (text)
  - [ ] phone (text)
  - [ ] avatar_url (text)
  - [ ] total_items_borrowed (integer, default 0)
  - [ ] current_items_borrowed (integer, default 0)
  - [ ] created_at (timestamp)
  - [ ] updated_at (timestamp)
  - [ ] Index on user_id
- [ ] Create `items` table
  - [ ] id (uuid, primary key)
  - [ ] user_id (uuid, foreign key → users)
  - [ ] name (text, required)
  - [ ] description (text)
  - [ ] category (text, required)
  - [ ] image_url (text)
  - [ ] borrowed_by (uuid, foreign key → friends)
  - [ ] borrowed_date (timestamp, required)
  - [ ] due_date (timestamp)
  - [ ] returned_date (timestamp)
  - [ ] notes (text)
  - [ ] created_at (timestamp)
  - [ ] updated_at (timestamp)
  - [ ] Index on user_id
  - [ ] Index on borrowed_by
- [ ] Create `borrow_history` table
  - [ ] id (uuid, primary key)
  - [ ] item_id (uuid, foreign key → items)
  - [ ] friend_id (uuid, foreign key → friends)
  - [ ] borrowed_date (timestamp)
  - [ ] due_date (timestamp)
  - [ ] returned_date (timestamp)
  - [ ] notes (text)
  - [ ] created_at (timestamp)
  - [ ] Index on item_id
  - [ ] Index on friend_id

### Row Level Security (RLS)
- [ ] Enable RLS on all tables
- [ ] Create policy: Users can only read their own data
- [ ] Create policy: Users can only insert their own data
- [ ] Create policy: Users can only update their own data
- [ ] Create policy: Users can only delete their own data
- [ ] Test RLS policies thoroughly

### Supabase Storage
- [ ] Create storage bucket for item images
- [ ] Enable public access for images (with RLS)
- [ ] Create storage policies
  - [ ] Users can upload to their own folder
  - [ ] Users can read their own images
  - [ ] Users can delete their own images
- [ ] Implement image upload to Supabase Storage
- [ ] Implement image deletion from storage

### Database Functions
- [ ] Create function to update friend stats (trigger on item changes)
- [ ] Create function to auto-archive old history
- [ ] Create function to check for overdue items

---

## Phase 10: Backend Integration

### Data Migration
- [ ] Create migration script from AsyncStorage to Supabase
- [ ] Test migration with sample data
- [ ] Add "Sync to Cloud" option in settings
- [ ] Handle conflicts during migration

### API Integration
- [ ] Update `lib/database.ts` to use Supabase client
  - [ ] Switch from AsyncStorage to Supabase queries
  - [ ] Maintain same API surface for hooks
  - [ ] Add error handling
  - [ ] Add loading states
- [ ] Implement optimistic updates for better UX
- [ ] Handle offline mode gracefully
  - [ ] Queue mutations when offline
  - [ ] Sync when back online
  - [ ] Show offline indicator

### Real-time Features (Optional)
- [ ] Subscribe to changes in items table
- [ ] Subscribe to changes in friends table
- [ ] Update UI in real-time when data changes
- [ ] Show "Someone else updated this" indicator

### Image Upload Flow
- [ ] Update image handling to upload to Supabase Storage
- [ ] Show upload progress
- [ ] Handle upload failures
- [ ] Delete old images when item is deleted
- [ ] Implement image caching for performance

---

## Phase 11: Advanced Features

### Statistics & Insights
- [ ] Create statistics screen
- [ ] Show total items lent
- [ ] Show total friends
- [ ] Show most borrowed items
- [ ] Show most frequent borrowers
- [ ] Show average borrow duration
- [ ] Show overdue statistics
- [ ] Create charts (bar, pie) for visualizations

### Reminders & Smart Notifications
- [ ] Send reminder X days before due date (configurable)
- [ ] Send reminder on due date
- [ ] Send overdue notification
- [ ] Add "snooze" option for reminders
- [ ] Add "nudge friend" feature (send reminder to friend)
- [ ] Smart suggestions (e.g., "You haven't checked on this in a while")

### Sharing & Collaboration (Future)
- [ ] Allow sharing item with multiple users
- [ ] Collaborative item tracking (split ownership)
- [ ] Invite friends to app
- [ ] Share item link

### Import/Export
- [ ] Export data to JSON
- [ ] Export data to CSV
- [ ] Import data from JSON
- [ ] Backup to cloud storage (Google Drive, iCloud)
- [ ] Scheduled automatic backups

### Accessibility
- [ ] Add proper accessibility labels
- [ ] Support screen readers
- [ ] Ensure proper color contrast
- [ ] Support dynamic text sizing
- [ ] Test with VoiceOver (iOS) and TalkBack (Android)

### Offline Support
- [ ] Implement offline-first architecture
- [ ] Queue mutations when offline
- [ ] Sync when connection restored
- [ ] Show sync status indicator
- [ ] Handle conflicts intelligently

---

## Phase 12: Testing

### Unit Tests
- [ ] Test utility functions (storage, database, etc.)
- [ ] Test data transformation functions
- [ ] Test validation logic
- [ ] Test hooks logic
- [ ] Aim for >80% coverage on utilities

### Component Tests
- [ ] Test ItemCard rendering
- [ ] Test FriendCard rendering
- [ ] Test form components
- [ ] Test empty states
- [ ] Test error states
- [ ] Test loading states

### Integration Tests
- [ ] Test full flow: add item → view item → return item
- [ ] Test full flow: add friend → assign item → view friend
- [ ] Test navigation between screens
- [ ] Test authentication flow
- [ ] Test offline/online sync

### E2E Tests (with Maestro or Detox)
- [ ] Set up E2E testing framework
- [ ] Test user onboarding
- [ ] Test adding and returning an item
- [ ] Test adding a friend
- [ ] Test search functionality
- [ ] Test notifications

### Manual Testing Checklist
- [ ] Test on iOS device
- [ ] Test on Android device
- [ ] Test on various screen sizes
- [ ] Test in light mode
- [ ] Test in dark mode
- [ ] Test with poor network
- [ ] Test with no network
- [ ] Test with large datasets (100+ items)
- [ ] Test edge cases (empty states, errors)

---

## Phase 13: Performance Optimization

### Bundle Optimization
- [ ] Run bundle analyzer
- [ ] Remove unused dependencies
- [ ] Implement code splitting
- [ ] Lazy load heavy components
- [ ] Optimize images

### Runtime Performance
- [ ] Implement React.memo where appropriate
- [ ] Use useCallback for event handlers
- [ ] Use useMemo for expensive computations
- [ ] Implement virtual lists for long lists (FlatList optimization)
- [ ] Profile app with React DevTools
- [ ] Fix any performance bottlenecks

### Network Performance
- [ ] Implement request caching
- [ ] Implement pagination for large datasets
- [ ] Reduce API calls with batching
- [ ] Compress uploaded images
- [ ] Use CDN for static assets

### Startup Performance
- [ ] Reduce initial bundle size
- [ ] Optimize splash screen display
- [ ] Lazy load non-critical screens
- [ ] Measure and improve startup time

---

## Phase 14: Polish & UX

### Animations
- [ ] Add page transitions
- [ ] Add card press animations
- [ ] Add FAB animation
- [ ] Add modal slide animations
- [ ] Add list item animations (add/remove)
- [ ] Add loading skeletons

### Micro-interactions
- [ ] Add haptic feedback on key actions
- [ ] Add success animations (confetti for returns?)
- [ ] Add swipe gestures (swipe to delete, etc.)
- [ ] Add pull-to-refresh animation
- [ ] Add empty state illustrations

### Error Handling
- [ ] Friendly error messages
- [ ] Retry mechanisms for failed requests
- [ ] Toast notifications for errors
- [ ] Offline banner
- [ ] Network error recovery

### Onboarding
- [ ] Create welcome screen
- [ ] Create tutorial/walkthrough screens
- [ ] Add helpful tooltips for first-time users
- [ ] Show sample data in empty app

---

## Phase 15: App Store Preparation

### Assets
- [ ] Design final app icon (1024x1024)
- [ ] Create adaptive icon for Android
- [ ] Design splash screen
- [ ] Create app store screenshots (iOS)
  - [ ] 6.7" display (iPhone 15 Pro Max)
  - [ ] 6.5" display (iPhone 14 Plus)
  - [ ] 5.5" display (iPhone 8 Plus)
  - [ ] 12.9" display (iPad Pro)
- [ ] Create app store screenshots (Android)
  - [ ] Phone
  - [ ] 7" tablet
  - [ ] 10" tablet
- [ ] Design feature graphic (Android)
- [ ] Create promo video (optional)

### App Store Listing (iOS)
- [ ] Write app name (30 chars max)
- [ ] Write subtitle (30 chars max)
- [ ] Write promotional text (170 chars max)
- [ ] Write description (4000 chars max)
- [ ] Choose keywords
- [ ] Choose category (Productivity)
- [ ] Set up App Store Connect account
- [ ] Create app privacy policy
- [ ] Fill out privacy questionnaire

### Play Store Listing (Android)
- [ ] Write short description (80 chars)
- [ ] Write full description (4000 chars)
- [ ] Create privacy policy URL
- [ ] Choose category (Productivity)
- [ ] Set up Google Play Console account
- [ ] Fill out content rating questionnaire

### Legal
- [ ] Create privacy policy
- [ ] Create terms of service
- [ ] Add privacy policy to app settings
- [ ] Add terms of service to sign-up flow
- [ ] Ensure GDPR compliance (if applicable)
- [ ] Ensure CCPA compliance (if applicable)

---

## Phase 16: Deployment

### EAS Build Setup
- [ ] Install eas-cli globally
- [ ] Run `eas login`
- [ ] Run `eas build:configure`
- [ ] Configure eas.json for production builds
  - [ ] iOS production profile
  - [ ] Android production profile
- [ ] Set up environment variables in EAS
- [ ] Configure app signing (credentials)

### iOS Deployment
- [ ] Create App Store Connect record
- [ ] Configure app identifier
- [ ] Set up provisioning profiles
- [ ] Build production iOS app with EAS
  - [ ] `eas build --platform ios --profile production`
- [ ] Test build with TestFlight
- [ ] Submit for App Store review
- [ ] Monitor review status
- [ ] Address any review feedback

### Android Deployment
- [ ] Create Google Play Console record
- [ ] Configure app signing key
- [ ] Set up internal testing track
- [ ] Build production Android app with EAS
  - [ ] `eas build --platform android --profile production`
- [ ] Upload to internal testing
- [ ] Test internal release
- [ ] Promote to production
- [ ] Monitor for crashes

### Web Deployment (Optional)
- [ ] Build web version: `npx expo export --platform web`
- [ ] Set up hosting (Vercel, Netlify, etc.)
- [ ] Configure custom domain
- [ ] Set up SSL certificate
- [ ] Deploy web app
- [ ] Add PWA support (optional)

---

## Phase 17: Post-Launch

### Monitoring & Analytics
- [ ] Set up Sentry for error tracking
- [ ] Set up analytics (Amplitude, Mixpanel, or PostHog)
- [ ] Track key events (item added, item returned, etc.)
- [ ] Set up crash reporting
- [ ] Monitor app performance metrics
- [ ] Track user retention

### User Feedback
- [ ] Add in-app feedback form
- [ ] Monitor app store reviews
- [ ] Respond to user reviews
- [ ] Create feedback roadmap
- [ ] Set up user support channel (email, Discord, etc.)

### Updates & Maintenance
- [ ] Fix critical bugs immediately
- [ ] Plan feature updates based on feedback
- [ ] Keep dependencies up to date
- [ ] Monitor security vulnerabilities
- [ ] Test on new OS versions (iOS/Android)

### Marketing (Optional)
- [ ] Create landing page
- [ ] Write blog post about launch
- [ ] Share on social media
- [ ] Submit to app directories
- [ ] Reach out to tech blogs/reviewers

---

## Future Features (Backlog)

### Social Features
- [ ] Share items with friends (collaborative tracking)
- [ ] Send reminder to friend via SMS/email
- [ ] In-app chat with friends
- [ ] Public profile pages

### Advanced Item Management
- [ ] Barcodes/QR codes for quick item entry
- [ ] Item value tracking
- [ ] Item condition tracking (before/after photos)
- [ ] Insurance information
- [ ] Item location tracking

### Monetization (If Applicable)
- [ ] Premium features (unlimited items, advanced stats)
- [ ] Subscription model
- [ ] One-time purchase option
- [ ] Remove ads (if using ads)

### Gamification
- [ ] Achievement badges
- [ ] Streaks (returning items on time)
- [ ] Leaderboards (most reliable friends)
- [ ] Points system

### Integrations
- [ ] Calendar integration (add due dates to calendar)
- [ ] Contacts integration (import friends from contacts)
- [ ] Google Drive backup
- [ ] iCloud backup

---

## Current Sprint (Next Up)

Based on current status (as of 2026-01-19), focus on these tasks:

1. [x] Create type definitions in `lib/types.ts`
2. [x] Create core UI components (ItemCard, FriendCard, EmptyState)
3. [x] Set up local storage with AsyncStorage
4. [x] Create basic data services in `lib/database.ts`
5. [x] Create React hooks for data management
6. [x] Update home screen to use real data
7. [x] Create add-item modal
8. [x] Create add-friend modal
9. [~] Create item detail screen (in progress)
10. [~] Create friend detail screen (in progress)

**Next priorities:**
- Complete item and friend detail screens
- Add edit functionality for items and friends
- Implement image picker for items and friend avatars
- Add date picker for due dates
- Create filter/sort functionality for items list

---

## Notes

- This is a living document - update as priorities change
- Mark tasks complete as you finish them
- Add new tasks as they're discovered
- Re-evaluate phases after user feedback
- Don't try to build everything at once - ship early, iterate often
- Focus on core value proposition first: "Never forget who has your stuff"

---

**Last Updated:** 2026-01-19
