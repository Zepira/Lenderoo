# Supabase Setup Guide for Lenderoo

This guide will walk you through setting up Supabase authentication and database for Lenderoo.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- Node.js and Yarn installed
- The Lenderoo project cloned locally

## Step 1: Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in the details:
   - **Project Name**: Lenderoo
   - **Database Password**: Choose a strong password (save this somewhere safe)
   - **Region**: Choose the region closest to you
4. Click "Create new project"
5. Wait for the project to be created (this may take a few minutes)

## Step 2: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (this is safe to use in your app)

## Step 3: Configure Environment Variables

Your `.env` file should already have placeholders. Update them with your actual values:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: Never commit your actual API keys to version control!

## Step 4: Run Database Migrations

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste it into the SQL editor
5. Click "Run" to execute the migration

This will create:
- ✅ Users table (extends auth.users)
- ✅ Friends table
- ✅ Items table
- ✅ Borrow history table
- ✅ Row Level Security (RLS) policies
- ✅ Indexes for performance
- ✅ Triggers for auto-updating timestamps
- ✅ Trigger for auto-creating user profiles on signup

## Step 5: Configure Authentication

1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. Enable **Email** authentication (should be enabled by default)
3. Configure email templates (optional):
   - Go to **Authentication** → **Email Templates**
   - Customize the confirmation email, password reset email, etc.

### Email Confirmation Settings

By default, Supabase requires email confirmation. You can:

**Option A: Require email confirmation (recommended for production)**
- Users will receive a confirmation email after signup
- They must click the link to verify their email before signing in

**Option B: Disable email confirmation (for development)**
1. Go to **Authentication** → **Settings**
2. Scroll to "Email Auth"
3. Toggle off "Enable email confirmations"
4. Click "Save"

## Step 6: Test the Setup

### Test Authentication

1. Start your Expo app:
   ```bash
   yarn start
   ```

2. Navigate to the sign-up screen
3. Create a new account with:
   - Name: Test User
   - Email: test@example.com
   - Password: testpassword123

4. Check the following:
   - [ ] User is created in Supabase Auth (Authentication → Users)
   - [ ] User profile is auto-created in `public.users` table (Database → Tables → users)
   - [ ] You can sign in with the credentials
   - [ ] You can sign out

### Test Data Operations

1. Sign in to your app
2. Add a friend
3. Add an item and lend it to the friend
4. Verify in Supabase:
   - Go to **Database** → **Tables**
   - Check `friends` table - your friend should appear
   - Check `items` table - your item should appear

### Test Row Level Security

1. Create a second user account
2. Sign in as the second user
3. Verify that:
   - You cannot see the first user's items
   - You cannot see the first user's friends
   - You can only see your own data

## Step 7: Data Migration from AsyncStorage

If you have existing data in AsyncStorage (local storage), it will be automatically migrated to Supabase on first sign-in.

**Migration happens automatically when:**
- You sign in for the first time after enabling Supabase
- The app detects local data in AsyncStorage
- The migration hasn't been completed before

**What gets migrated:**
- ✅ All your friends
- ✅ All your items
- ✅ Borrow history

**Note:** The migration is idempotent - it will only run once. A flag is stored in AsyncStorage to prevent duplicate migrations.

## Troubleshooting

### Issue: "Missing Supabase environment variables"

**Solution**: Make sure your `.env` file has the correct Supabase URL and anon key.

### Issue: "No authenticated user" error

**Solution**:
- Make sure you're signed in
- Check that RLS policies are correctly set up
- Verify the SQL migration ran successfully

### Issue: Email confirmation not working

**Solution**:
- Check your spam folder
- In Supabase dashboard, go to **Authentication** → **Users** and manually confirm the user
- Or disable email confirmation for development (see Step 5)

### Issue: "Failed to create friend/item"

**Solution**:
- Check Supabase logs: **Logs** → **Postgres Logs**
- Verify RLS policies are active: **Database** → **Tables** → (select table) → **Policies**
- Make sure you're authenticated

### Issue: Can't see data from other devices

**Solution**: This is expected! RLS policies ensure users can only see their own data. Sign in with the same account on multiple devices to sync data.

## Database Schema Overview

### Users Table (`public.users`)
- Extends Supabase auth.users with app-specific fields
- Stores: name, email, avatar_url
- Auto-created on signup via trigger

### Friends Table (`public.friends`)
- Stores friends who borrow items
- Fields: name, email, phone, avatar_url, borrow counts
- Scoped to user via RLS

### Items Table (`public.items`)
- Stores items that can be lent
- Fields: name, description, category, images, borrow info, metadata
- Links to friends via `borrowed_by` foreign key
- Scoped to user via RLS

### Borrow History Table (`public.borrow_history`)
- Tracks historical borrowing records
- Links to items and friends
- Useful for statistics and history

## Security

### Row Level Security (RLS)

All tables have RLS enabled with the following policies:

- ✅ Users can only read their own data
- ✅ Users can only insert their own data
- ✅ Users can only update their own data
- ✅ Users can only delete their own data

### API Keys

- **anon key**: Safe to use in your app (client-side)
- **service_role key**: NEVER use this in your app (server-only, has full access)

## Next Steps

Once authentication is working, you can:

1. **Enable real-time subscriptions** to sync data across devices
2. **Add profile picture uploads** using Supabase Storage
3. **Add social auth** (Google, Apple, etc.)
4. **Set up push notifications** for overdue items
5. **Add item sharing** between users

## Support

If you run into issues:

1. Check Supabase logs: Dashboard → **Logs**
2. Check the browser console for errors
3. Check React Native logs: `yarn start` then press `j` for JS debugger
4. Open an issue on the Lenderoo GitHub repo

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
