# Lenderoo

Never forget who borrowed your stuff. Lenderoo lets you track items you've lent to friends, send borrow requests, and manage your lending library.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.81.5 (New Architecture) + Expo Router v6 |
| Styling | NativeWind v4.2.1 (Tailwind CSS) |
| Language | TypeScript (strict mode) |
| Backend | Supabase (auth, PostgreSQL, storage) |
| Data fetching | TanStack Query v5 |
| Icons | Lucide React Native |
| Toasts | `burnt` |
| Package manager | Yarn 4.5.0 |
| Linter/formatter | Biome |

## Quick Start

```bash
yarn install
yarn start        # starts Expo dev server with tunnel
```

Then press `a` for Android or `i` for iOS. Do not use `w` (web) — AsyncStorage is not configured for web.

### Dev auto-login

Add your test credentials to `.env` to skip the login screen locally:

```
EXPO_PUBLIC_DEV_EMAIL=your@email.com
EXPO_PUBLIC_DEV_PASSWORD=yourpassword
```

The app signs in automatically when `__DEV__` is true and these are set.

## Project Structure

```
app/
  _layout.tsx               Root layout (auth guard, providers)
  (auth)/                   Sign-in / sign-up screens
  (tabs)/
    _layout.tsx             Tab bar
    index.tsx               Home (active borrows)
    library/                Your item library
    explore/                Book discovery (Hardcover API)
    friends/                Friends + borrow requests
    settings/               Profile, theme, sign out
  item/[id].tsx             Item detail
  add-item.tsx              Add item modal

components/
  ui/                       Button, Text, Card, Avatar, Input, etc.
  SafeAreaWrapper.tsx

contexts/
  AuthContext.tsx           Session + user state
  ThemeContext.tsx

hooks/
  useItems.ts
  useFriends.ts
  useBorrowRequests.ts

lib/
  supabase.ts               Supabase client
  types.ts                  Shared TypeScript types
  friends-service.ts        Friend connection queries
  borrow-requests-service.ts
  database-supabase.ts      Items / history queries
  toast.ts                  Toast helpers

supabase/
  migrations/               SQL migration files
  functions/
    hardcover-proxy/        Edge function (CORS proxy for Hardcover API)
```

## Scripts

```bash
yarn start          # dev server
yarn android        # run on Android
yarn ios            # run on iOS
yarn test           # Jest (watch mode)

npx @biomejs/biome check --write .   # lint + format
```

## Key Conventions

- **Styling**: always use `className` (NativeWind). Never inline styles or Tamagui.
- **Components**: reach for `components/ui/` before writing a new styled element.
- **Toasts**: `import { toast } from '@/lib/toast'` → `toast.success()` / `toast.error()`.
- **Icons**: `import * as Icons from 'lucide-react-native'`.
- **Imports**: use `@/` alias (e.g. `@/lib/supabase`).

## Setup & Deployment

See [SETUP.md](./SETUP.md) for:
- Supabase project and database migration setup
- Hardcover API edge function deploy (CORS fix for web)
- GitHub Actions secrets and CI/CD
