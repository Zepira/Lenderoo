# GitHub Secrets Setup Guide

This guide will help you set up the required GitHub Secrets for deploying your Expo web app with all necessary environment variables.

## Why GitHub Secrets?

GitHub Secrets are encrypted environment variables that you can use in GitHub Actions workflows. They keep sensitive data (like API keys) secure and out of your repository.

## Required Secrets

You need to add the following secrets to your GitHub repository:

### 1. EXPO_TOKEN
Your Expo account access token (already configured if deployments are working)

### 2. EXPO_PUBLIC_SUPABASE_URL
Your Supabase project URL

**Example:** `https://xxxxxxxxxxxxx.supabase.co`

**Where to find it:**
1. Go to your Supabase project dashboard
2. Click **Settings** → **API**
3. Copy the **Project URL**

### 3. EXPO_PUBLIC_SUPABASE_ANON_KEY
Your Supabase anonymous (public) key

**Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (very long string)

**Where to find it:**
1. Go to your Supabase project dashboard
2. Click **Settings** → **API**
3. Copy the **anon public** key

### 4. EXPO_PUBLIC_HARDCOVER_API_TOKEN
Your Hardcover API token for book metadata

**Example:** `eyJhbGciOiJIUzI1NiJ9...` (very long string)

**Where to find it:**
- From your `.env` file: The value you already have
- Or get a new one at: https://hardcover.app/account

### 5. EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY
Your Google Books API key (if you're using it)

**Example:** `AIzaSyDUXegmMJzRbmyFPefa047_tRf4WO3PIg4`

**Where to find it:**
- From your `.env` file: The value you already have
- Or get a new one at: https://console.cloud.google.com/apis/credentials

## How to Add GitHub Secrets

### Step 1: Navigate to Repository Settings

1. Go to your GitHub repository: https://github.com/yourusername/lenderoo
2. Click **Settings** (top right tab)
3. In the left sidebar, click **Secrets and variables** → **Actions**

### Step 2: Add Each Secret

For each secret listed above:

1. Click **New repository secret** (green button)
2. Enter the **Name** (exactly as shown above, e.g., `EXPO_PUBLIC_SUPABASE_URL`)
3. Enter the **Value** (the actual API key/URL)
4. Click **Add secret**

### Example: Adding Supabase URL

```
Name: EXPO_PUBLIC_SUPABASE_URL
Value: https://ymboxvasluhlwgofrpya.supabase.co
```

Click **Add secret**

### Example: Adding Supabase Anon Key

```
Name: EXPO_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltYm94dmFzbHVobHdnb2ZycHlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NTI1NTksImV4cCI6MjA4NDMyODU1OX0.WSQlKPXWw3cxn2Qqnrhp-kniqKGBIkXYloLDqgCIgWw
```

Click **Add secret**

### Example: Adding Hardcover Token

```
Name: EXPO_PUBLIC_HARDCOVER_API_TOKEN
Value: eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJIYXJkY292ZXIiLCJ2ZXJzaW9uIjoiOCIsImp0aSI6ImJlYzY4M2JjLWZlYWMtNDA5NS04ZmJkLTIzZTljZDY5ODJhYyIsImFwcGxpY2F0aW9uSWQiOjIsInN1YiI6IjcxMTUxIiwiYXVkIjoiMSIsImlkIjoiNzExNTEiLCJsb2dnZWRJbiI6dHJ1ZSwiaWF0IjoxNzY5NDAxNDI3LCJleHAiOjE4MDA5Mzc0MjcsImh0dHBzOi8vaGFzdXJhLmlvL2p3dC9jbGFpbXMiOnsieC1oYXN1cmEtYWxsb3dlZC1yb2xlcyI6WyJ1c2VyIl0sIngtaGFzdXJhLWRlZmF1bHQtcm9sZSI6InVzZXIiLCJ4LWhhc3VyYS1yb2xlIjoidXNlciIsIlgtaGFzdXJhLXVzZXItaWQiOiI3MTE1MSJ9LCJ1c2VyIjp7ImlkIjo3MTE1MX19.egLScOBWOeSp3X70YBg_oPtruE3yYK3_tDnx6TQ6vS8
```

Click **Add secret**

### Example: Adding Google Books API Key

```
Name: EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY
Value: AIzaSyDUXegmMJzRbmyFPefa047_tRf4WO3PIg4
```

Click **Add secret**

## Step 3: Verify Secrets

After adding all secrets, you should see them listed on the **Actions secrets** page:

- ✅ EXPO_TOKEN
- ✅ EXPO_PUBLIC_SUPABASE_URL
- ✅ EXPO_PUBLIC_SUPABASE_ANON_KEY
- ✅ EXPO_PUBLIC_HARDCOVER_API_TOKEN
- ✅ EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY

**Note:** You can't view the values after saving (for security), but you can update them by clicking the secret name.

## Step 4: Test the Workflow

### Trigger the Workflow

**Option A:** Push to main/master branch
```bash
git add .
git commit -m "Update workflow with environment variables"
git push origin master
```

**Option B:** Manually trigger
1. Go to **Actions** tab in GitHub
2. Click **Deploy Web to Expo** workflow
3. Click **Run workflow** dropdown
4. Click **Run workflow** button

### Check the Build

1. Go to **Actions** tab
2. Click on the running workflow
3. Expand the **Export web build** step
4. Check for any errors related to environment variables

## Troubleshooting

### Error: "Missing environment variable"

**Solution:** Make sure the secret name matches exactly (including capitalization):
- ✅ `EXPO_PUBLIC_SUPABASE_URL`
- ❌ `expo_public_supabase_url`
- ❌ `SUPABASE_URL`

### Error: "Invalid Supabase URL"

**Solution:**
- URL should start with `https://`
- URL should end with `.supabase.co`
- No trailing slash

Example: `https://xxxxx.supabase.co` ✅

### Error: "Authentication failed"

**Solution:**
- Check that `EXPO_PUBLIC_SUPABASE_ANON_KEY` is the **anon public** key, not the service_role key
- The anon key is safe to use in client-side code
- Never use the service_role key in GitHub Secrets for web deployment

### Build Succeeds but Auth Doesn't Work

**Possible causes:**

1. **Wrong Supabase key:** Make sure you're using the `anon public` key
2. **CORS not configured:**
   - Go to Supabase dashboard
   - **Settings** → **API** → **CORS**
   - Add your deployment URL (e.g., `https://yourapp.expo.dev`)

3. **Environment variables not available:**
   - The `EXPO_PUBLIC_` prefix is required for Expo to expose them to the client
   - Variables without this prefix won't be available in the web build

## Security Best Practices

### ✅ DO:
- Use `EXPO_PUBLIC_` prefix for client-side environment variables
- Keep service_role keys in your local `.env` only (never in GitHub Secrets for web deployment)
- Rotate API keys periodically
- Enable Row Level Security (RLS) in Supabase

### ❌ DON'T:
- Commit `.env` file to GitHub
- Use service_role keys in web builds
- Share secret values in public channels
- Use the same keys for production and development

## Environment Variable Naming Convention

For Expo to include environment variables in the web build, they must:

1. Start with `EXPO_PUBLIC_` prefix
2. Be set before build time (not runtime)
3. Be available in GitHub Secrets for CI/CD

**Example:**
```
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co  ✅ (accessible in app)
SUPABASE_URL=https://xxx.supabase.co              ❌ (not accessible in app)
```

## What Changed in expo-web.yml

The workflow file now includes environment variables in the build and deploy steps:

```yaml
- name: Export web build
  env:
    EXPO_PUBLIC_SUPABASE_URL: ${{ secrets.EXPO_PUBLIC_SUPABASE_URL }}
    EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.EXPO_PUBLIC_SUPABASE_ANON_KEY }}
    EXPO_PUBLIC_HARDCOVER_API_TOKEN: ${{ secrets.EXPO_PUBLIC_HARDCOVER_API_TOKEN }}
    EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY: ${{ secrets.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY }}
  run: npx expo export --platform web
```

This ensures all environment variables are available during the build process.

## Verification

After successful deployment, test your web app:

1. Open your deployed web app URL
2. Try to sign up / sign in
3. Check browser console for errors
4. Verify Supabase connection works
5. Verify book metadata fetching works (Hardcover API)

If authentication works and you can create items/friends, your environment variables are configured correctly! ✅

## Need Help?

If you encounter issues:

1. Check the **Actions** tab for build logs
2. Look for environment variable errors
3. Verify secret names match exactly
4. Check Supabase dashboard for API usage
5. Test locally first with your `.env` file

## Summary Checklist

- [ ] Add EXPO_TOKEN to GitHub Secrets (if not already added)
- [ ] Add EXPO_PUBLIC_SUPABASE_URL to GitHub Secrets
- [ ] Add EXPO_PUBLIC_SUPABASE_ANON_KEY to GitHub Secrets
- [ ] Add EXPO_PUBLIC_HARDCOVER_API_TOKEN to GitHub Secrets
- [ ] Add EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY to GitHub Secrets
- [ ] Commit and push updated expo-web.yml
- [ ] Trigger workflow (automatic on push to master/main)
- [ ] Check Actions tab for successful build
- [ ] Test deployed web app
- [ ] Verify authentication works
- [ ] Verify book fetching works

Once all secrets are configured, your web deployments will have access to all necessary API keys and services! 🚀
