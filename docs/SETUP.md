# Lenderoo Setup Guide

Everything needed to get the project running end-to-end: Supabase, the Hardcover API proxy, and GitHub CI/CD.

---

## 1. Supabase

### Create a project

1. Sign in at [supabase.com](https://supabase.com) and create a new project named **Lenderoo**
2. Choose a strong database password and your nearest region

### Get API keys

Settings → API → copy **Project URL** and **anon public** key, then add them to `.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Never commit `.env`. Never use the `service_role` key in the app.

### Run migrations

In the Supabase dashboard, go to **SQL Editor** and run each file in order:

| File | What it creates |
|---|---|
| `supabase/migrations/001_initial_schema.sql` | `users`, `items`, `friends`, `borrow_history` tables + RLS |
| `supabase/migrations/002_friend_system.sql` | `friend_connections`, `user_friends` view, friend codes |

After running, verify the tables exist under **Database → Tables**.

### Auth settings

- Go to **Authentication → Settings → Email Auth**
- For local development, disable **Enable email confirmations** so you can sign up without checking email
- Re-enable for production

### Row Level Security

All tables use RLS — users can only read and write their own data. Policies are created by the migrations. If data access is failing, check **Database → Tables → [table] → Policies**.

---

## 2. Hardcover API CORS Proxy (web builds only)

The Hardcover API blocks cross-origin requests from browsers. The fix is a Supabase Edge Function that proxies the request server-side.

**This is only needed if deploying a web build.** Native apps call the API directly.

### Deploy

```bash
# Install Supabase CLI
npm install -g supabase

# Login and link to your project
supabase login
supabase link --project-ref <your-project-ref>   # found in Settings → General

# Store the Hardcover token as a secret (use the value from your .env)
supabase secrets set HARDCOVER_API_TOKEN="eyJ..."

# Deploy the function
supabase functions deploy hardcover-proxy

# Verify
supabase functions list   # should show hardcover-proxy as ACTIVE
```

### Test it

```bash
curl -X POST \
  "https://<your-project-ref>.supabase.co/functions/v1/hardcover-proxy" \
  -H "Authorization: Bearer <your-supabase-anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"query":"query{search(query:\"Harry Potter\",query_type:\"books\",per_page:1){results}}"}'
```

A JSON response with book data means it's working.

### How it works

`lib/hardcover-api.ts` auto-detects the platform:
- **Web**: routes through `<supabase-url>/functions/v1/hardcover-proxy`
- **Native**: calls `https://api.hardcover.app/v1/graphql` directly

### Troubleshooting

| Error | Fix |
|---|---|
| "Hardcover API token not configured" | `supabase secrets set HARDCOVER_API_TOKEN="..."` then redeploy |
| CORS errors still appearing | Hard refresh (Ctrl+Shift+R), clear cache, verify deployment |
| 401 Unauthorized | Token expired — get a new one at hardcover.app/account, update secret, redeploy |

```bash
# View function logs
supabase functions logs hardcover-proxy --follow
```

---

## 3. GitHub Actions / CI/CD

### Required secrets

Go to your GitHub repo → **Settings → Secrets and variables → Actions** and add:

| Secret name | Where to find it |
|---|---|
| `EXPO_TOKEN` | expo.dev → Account → Access Tokens |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public key |
| `EXPO_PUBLIC_HARDCOVER_API_TOKEN` | hardcover.app/account (same as in your `.env`) |

### Workflows

| File | Trigger | What it does |
|---|---|---|
| `expo-update.yml` | Push to main | OTA update via EAS Update |
| `expo-eas-build.yml` | Manual | Native build (iOS/Android) via EAS Build |
| `expo-web.yml` | Push to main | Web build → GitHub Pages |

### EAS setup (one-time)

```bash
npm install -g eas-cli
eas login
eas build:configure
```

Then configure `eas.json` for your build profiles (development, preview, production).

### GitHub Pages (web)

1. Repo → Settings → Pages → Source: **GitHub Actions**
2. Set `basePath: "/Lenderoo"` in `app.json` (must match your repo name)
3. Push to main — the `expo-web.yml` workflow handles the rest

For a custom domain: add a `CNAME` file to the project root, configure DNS, and update `app.json` to remove `basePath`.

---

## 4. Environment variables reference

```
# Required
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=

# Optional — book search via Hardcover
EXPO_PUBLIC_HARDCOVER_API_TOKEN=

# Optional — dev auto-login (never set in production)
EXPO_PUBLIC_DEV_EMAIL=
EXPO_PUBLIC_DEV_PASSWORD=
```

Copy `.env.example` to `.env` and fill in your values.
