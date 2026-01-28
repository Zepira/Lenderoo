# Fixing Hardcover API CORS Issues

## Problem

When your Expo web app is deployed, calling the Hardcover API directly from the browser results in CORS errors:

```
Access to fetch at 'https://api.hardcover.app/v1/graphql' from origin
'https://yourapp.expo.dev' has been blocked by CORS policy
```

This happens because:
- Browser security prevents direct API calls from one domain to another
- Hardcover API doesn't allow requests from your Expo web domain
- **This only affects web** - native iOS/Android apps work fine

## Solution: Supabase Edge Function Proxy

We've created a Supabase Edge Function that acts as a proxy:

```
Your Web App → Supabase Edge Function → Hardcover API
   (expo.dev)      (supabase.co)         (hardcover.app)
```

The Edge Function runs on your Supabase domain, so no CORS issues!

## Implementation Status

✅ **Code Updated**
- `lib/hardcover-api.ts` now auto-detects platform
- Web: Uses Supabase proxy
- Native: Direct API call (no change)

✅ **Edge Function Created**
- `supabase/functions/hardcover-proxy/index.ts`

## Setup Steps

### Step 1: Install Supabase CLI

If you haven't already:

```bash
# Install Supabase CLI
npm install -g supabase

# Or with Homebrew (Mac)
brew install supabase/tap/supabase

# Verify installation
supabase --version
```

### Step 2: Link Your Supabase Project

```bash
cd "D:\Repos\Personal Repos\Lenderoo\Lenderoo"

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref ymboxvasluhlwgofrpya
```

**Note:** Get your project ref from:
- Supabase Dashboard → Settings → General → Reference ID
- Or from your Supabase URL: `https://[PROJECT_REF].supabase.co`

### Step 3: Set the Hardcover API Token Secret

The Edge Function needs your Hardcover API token:

```bash
# Set the secret
supabase secrets set HARDCOVER_API_TOKEN="eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJIYXJkY292ZXIi..."
```

Use the same token from your `.env` file (line 45).

### Step 4: Deploy the Edge Function

```bash
# Deploy the hardcover-proxy function
supabase functions deploy hardcover-proxy

# Verify deployment
supabase functions list
```

You should see:
```
┌──────────────────┬────────┬─────────┐
│ NAME             │ STATUS │ REGION  │
├──────────────────┼────────┼─────────┤
│ hardcover-proxy  │ ACTIVE │ us-east │
└──────────────────┴────────┴─────────┘
```

### Step 5: Test the Edge Function

Test it works:

```bash
# Test with a simple GraphQL query
curl -X POST \
  "https://ymboxvasluhlwgofrpya.supabase.co/functions/v1/hardcover-proxy" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { search(query: \"Harry Potter\", query_type: \"books\", per_page: 1) { results } }"
  }'
```

You should get a JSON response with book data.

### Step 6: Deploy Your Web App

Now deploy your web app with the updated code:

```bash
# Commit the changes
git add .
git commit -m "Add Supabase proxy for Hardcover API to fix CORS"
git push origin master
```

The GitHub Actions workflow will automatically build and deploy.

### Step 7: Verify It Works

1. Open your deployed web app
2. Try to add a book
3. Search for a book (e.g., "Harry Potter")
4. Check browser console - should see successful API calls
5. No CORS errors! ✅

## How It Works

### On Web (Browser)

```typescript
// lib/hardcover-api.ts automatically detects platform
const endpoint = Platform.OS === 'web'
  ? 'https://ymboxvasluhlwgofrpya.supabase.co/functions/v1/hardcover-proxy'
  : 'https://api.hardcover.app/v1/graphql';

// Fetch goes through Supabase Edge Function
fetch(endpoint, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer SUPABASE_ANON_KEY',
    'apikey': 'SUPABASE_ANON_KEY',
  },
  body: JSON.stringify({ query, variables })
})
```

### On Native (iOS/Android)

```typescript
// Direct API call (no CORS in native apps)
fetch('https://api.hardcover.app/v1/graphql', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer HARDCOVER_TOKEN',
  },
  body: JSON.stringify({ query, variables })
})
```

## Troubleshooting

### Error: "Hardcover API token not configured"

**Solution:**
```bash
# Check if secret is set
supabase secrets list

# Set it if missing
supabase secrets set HARDCOVER_API_TOKEN="your-token-here"

# Redeploy function
supabase functions deploy hardcover-proxy
```

### Error: "Failed to fetch" or Network Error

**Possible causes:**

1. **Edge Function not deployed:**
   ```bash
   supabase functions list
   # Should show hardcover-proxy as ACTIVE
   ```

2. **Wrong Supabase URL:**
   - Check `.env` has correct `EXPO_PUBLIC_SUPABASE_URL`
   - Should match your Supabase project URL

3. **Missing anon key:**
   - Check `.env` has `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - Get it from: Supabase Dashboard → Settings → API

### Error: "CORS policy" still appearing

**Solution:**

1. **Check platform detection:**
   - Open browser console
   - Look for log: "Making Hardcover API request"
   - Should show `platform: "web"` and proxy URL

2. **Hard refresh:**
   - Clear browser cache
   - Hard reload: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

3. **Verify deployment:**
   - Check your deployed app is using the new code
   - Look at GitHub Actions logs

### Error: 401 Unauthorized

**Solution:**

The Hardcover token might be expired or invalid:

1. Get a new token from https://hardcover.app/account
2. Update the secret:
   ```bash
   supabase secrets set HARDCOVER_API_TOKEN="new-token-here"
   supabase functions deploy hardcover-proxy
   ```
3. Update your `.env` file locally

### Edge Function Logs

View logs to debug issues:

```bash
# View recent logs
supabase functions logs hardcover-proxy

# Follow logs in real-time
supabase functions logs hardcover-proxy --follow
```

## Alternative Solution: Simple Express Proxy

If you prefer not to use Supabase Edge Functions, you can create a simple Express proxy:

<details>
<summary>Click to expand Express proxy code</summary>

```typescript
// server.js
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const HARDCOVER_TOKEN = process.env.HARDCOVER_API_TOKEN;

app.post('/api/hardcover', async (req, res) => {
  try {
    const response = await fetch('https://api.hardcover.app/v1/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HARDCOVER_TOKEN}`,
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('Proxy running on port 3000'));
```

Then update `lib/hardcover-api.ts`:
```typescript
const endpoint = Platform.OS === 'web'
  ? 'https://your-proxy.vercel.app/api/hardcover'
  : 'https://api.hardcover.app/v1/graphql';
```

</details>

## Testing Checklist

After deploying:

- [ ] Edge Function deployed successfully (`supabase functions list`)
- [ ] Secret set (`supabase secrets list` shows HARDCOVER_API_TOKEN)
- [ ] Can test Edge Function with curl (see Step 5)
- [ ] Web app deployed with updated code
- [ ] Can search for books on web without CORS errors
- [ ] Books display correctly with metadata
- [ ] Native apps still work (direct API call)

## Performance Notes

**Edge Function Benefits:**
- ✅ No CORS issues
- ✅ Runs on Supabase infrastructure (fast)
- ✅ Automatic scaling
- ✅ Free tier: 500K invocations/month
- ✅ Keeps API token secure (not exposed in browser)

**Latency:**
- Direct API: ~200-300ms
- Via Edge Function: ~250-400ms
- Small overhead (50-100ms) but worth it for CORS fix

## Security

**API Token Security:**
- ✅ Token stored as Supabase secret (encrypted)
- ✅ Not exposed in browser/web app
- ✅ Only Edge Function can access it
- ✅ Much better than hardcoding in web bundle

**Access Control:**
- Anyone can call your Edge Function
- But they need your Supabase anon key (public but tied to your project)
- Consider adding rate limiting if needed

## Cost Considerations

**Supabase Free Tier:**
- 500,000 Edge Function invocations/month
- If you exceed, ~$0.0000002 per invocation
- Very affordable for most use cases

**Example calculation:**
- 100 users × 10 searches/day = 1,000 calls/day
- 30,000 calls/month (well within free tier)

## Summary

✅ **Problem:** CORS errors when calling Hardcover API from web
✅ **Solution:** Supabase Edge Function proxy
✅ **Implementation:** Code updated, function created
✅ **Next Steps:** Deploy Edge Function (Steps 1-4)
✅ **Result:** Web app works without CORS issues

The best part? Native apps continue working with no changes! 🎉

## Support

If you encounter issues:

1. Check Supabase Edge Function logs: `supabase functions logs hardcover-proxy`
2. Verify secret is set: `supabase secrets list`
3. Test Edge Function with curl (see Step 5)
4. Check browser console for detailed error messages
5. Open an issue on GitHub with logs

## Additional Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli/introduction)
- [Hardcover API Docs](https://hardcover.app/api)
- [Understanding CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
