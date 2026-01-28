# Quick Start: Deploy Hardcover API Proxy

This is a quick reference for deploying the Supabase Edge Function to fix CORS issues.

## Prerequisites

```bash
# Install Supabase CLI (one time)
npm install -g supabase

# Or with Homebrew (Mac)
brew install supabase/tap/supabase
```

## Deploy in 4 Steps

### 1. Login & Link Project

```bash
# Navigate to project
cd "D:\Repos\Personal Repos\Lenderoo\Lenderoo"

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref ymboxvasluhlwgofrpya
```

### 2. Set API Token Secret

```bash
# Use the token from your .env file
supabase secrets set HARDCOVER_API_TOKEN="eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJIYXJkY292ZXIiLCJ2ZXJzaW9uIjoiOCIsImp0aSI6ImJlYzY4M2JjLWZlYWMtNDA5NS04ZmJkLTIzZTljZDY5ODJhYyIsImFwcGxpY2F0aW9uSWQiOjIsInN1YiI6IjcxMTUxIiwiYXVkIjoiMSIsImlkIjoiNzExNTEiLCJsb2dnZWRJbiI6dHJ1ZSwiaWF0IjoxNzY5NDAxNDI3LCJleHAiOjE4MDA5Mzc0MjcsImh0dHBzOi8vaGFzdXJhLmlvL2p3dC9jbGFpbXMiOnsieC1oYXN1cmEtYWxsb3dlZC1yb2xlcyI6WyJ1c2VyIl0sIngtaGFzdXJhLWRlZmF1bHQtcm9sZSI6InVzZXIiLCJ4LWhhc3VyYS1yb2xlIjoidXNlciIsIlgtaGFzdXJhLXVzZXItaWQiOiI3MTE1MSJ9LCJ1c2VyIjp7ImlkIjo3MTE1MX19.egLScOBWOeSp3X70YBg_oPtruE3yYK3_tDnx6TQ6vS8"
```

### 3. Deploy Function

```bash
# Deploy the Edge Function
supabase functions deploy hardcover-proxy

# Verify deployment
supabase functions list
```

Expected output:
```
┌──────────────────┬────────┬─────────┐
│ NAME             │ STATUS │ REGION  │
├──────────────────┼────────┼─────────┤
│ hardcover-proxy  │ ACTIVE │ us-east │
└──────────────────┴────────┴─────────┘
```

### 4. Test It Works

```bash
# Quick test
curl -X POST \
  "https://ymboxvasluhlwgofrpya.supabase.co/functions/v1/hardcover-proxy" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltYm94dmFzbHVobHdnb2ZycHlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NTI1NTksImV4cCI6MjA4NDMyODU1OX0.WSQlKPXWw3cxn2Qqnrhp-kniqKGBIkXYloLDqgCIgWw" \
  -H "Content-Type: application/json" \
  -d '{"query":"query{search(query:\"Harry Potter\",query_type:\"books\",per_page:1){results}}"}'
```

If you get JSON data back, it works! ✅

## Deploy Your Web App

```bash
git add .
git commit -m "Add Supabase proxy for Hardcover API to fix CORS"
git push origin master
```

GitHub Actions will automatically deploy the updated app.

## Verify in Production

1. Open your deployed web app
2. Try searching for a book
3. Check browser console - no CORS errors!
4. Books should load successfully

## Common Issues

### "Project not linked"
```bash
supabase link --project-ref ymboxvasluhlwgofrpya
```

### "Secret not found"
```bash
supabase secrets list  # Check if set
supabase secrets set HARDCOVER_API_TOKEN="your-token"
```

### "Function failed to deploy"
```bash
# Check function logs
supabase functions logs hardcover-proxy

# Try redeploying
supabase functions deploy hardcover-proxy --no-verify-jwt
```

### Still getting CORS errors
1. Hard refresh browser: Ctrl+Shift+R
2. Clear browser cache
3. Check deployment logs in GitHub Actions
4. Verify Edge Function is active: `supabase functions list`

## Useful Commands

```bash
# View function logs
supabase functions logs hardcover-proxy

# Follow logs in real-time
supabase functions logs hardcover-proxy --follow

# List all functions
supabase functions list

# List all secrets
supabase secrets list

# Delete a function (if needed)
supabase functions delete hardcover-proxy
```

## What Changed

### Files Modified
- ✅ `lib/hardcover-api.ts` - Auto-detects platform, uses proxy for web

### Files Created
- ✅ `supabase/functions/hardcover-proxy/index.ts` - Edge Function

### Behavior
- **Web**: API calls go through Supabase proxy → No CORS! ✅
- **Native**: Direct API calls as before → No change ✅

## Need Help?

See the full guide: `CORS_FIX_GUIDE.md`

## Success Checklist

After following these steps:

- [ ] Supabase CLI installed
- [ ] Project linked
- [ ] Secret set (HARDCOVER_API_TOKEN)
- [ ] Edge Function deployed and ACTIVE
- [ ] Function tested with curl
- [ ] Code committed and pushed
- [ ] Web app deployed
- [ ] Book search works without CORS errors
- [ ] Native apps still work

Done! 🎉 Your web app can now call the Hardcover API without CORS issues.
