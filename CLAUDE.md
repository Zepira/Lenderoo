# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React Native app using Expo Router with NativeWind for styling. The project uses Yarn 4.5.0 as the package manager and is configured with React Native's New Architecture enabled for both iOS and Android.

**Key Technologies:**
- **Expo Router** (v6) for file-based routing
- **NativeWind** (v4.2.1) for Tailwind CSS styling
- **React Native** 0.81.5 with React 19.1.0
- **TypeScript** with strict mode enabled
- **Biome** for linting and formatting
- **Jest** for testing
- **Supabase** for backend (auth, database, storage)
- **Lucide React Native** for icons

## Common Commands

### Development
```bash
# Start development server with tunnel
yarn start

# Run on Android
yarn android

# Run on iOS
yarn ios

# Run on web
yarn web

# Run tests in watch mode
yarn test
```

### Linting and Formatting
Use Biome for code quality:
```bash
# Format code
npx @biomejs/biome format --write .

# Lint code
npx @biomejs/biome lint .

# Check both
npx @biomejs/biome check .
```

## Architecture

### File-Based Routing (Expo Router)

The app uses Expo Router v6 with typed routes enabled. Routes are defined by the file structure in the `app/` directory:

- **`app/_layout.tsx`**: Root layout that handles authentication and navigation
- **`app/(auth)/`**: Authentication screens (sign-in, sign-up)
- **`app/(tabs)/_layout.tsx`**: Main tab navigator layout
- **`app/(tabs)/index.tsx`**: Home tab
- **`app/(tabs)/library/`**: Library tab with item management
- **`app/(tabs)/explore/`**: Explore tab for discovering books
- **`app/(tabs)/friends/`**: Friends tab
- **`app/(tabs)/settings/`**: Settings/profile tab
- **`app/add-item.tsx`**: Modal screen for adding items
- **`app/+not-found.tsx`**: 404 error screen

### Provider Hierarchy

The app is wrapped in multiple providers:

1. **SafeAreaProvider**: Handles safe area insets
2. **ThemeProvider**: Custom theme context for dark/light mode
3. **AuthProvider**: Handles user authentication state
4. **React Navigation ThemeProvider**: Applies theme to navigation
5. **StatusBar**: Configured based on color scheme

### Styling with NativeWind

This project uses **NativeWind v4**, which brings Tailwind CSS to React Native:

- Use `className` prop for styling (e.g., `className="flex-1 bg-background"`)
- Configuration in `tailwind.config.js`
- Global styles in `global.css`
- Custom UI components in `components/ui/` (button, text, card, avatar, etc.)
- Dark mode support via `dark:` prefix (e.g., `className="bg-white dark:bg-black"`)

**Important**: Always use NativeWind's `className` for styling. Do NOT use Tamagui components or styling patterns.

### UI Component Library

Custom UI components are located in `components/ui/`:
- `Button` - Styled button with variants
- `Text` - Typography with variants (h1, h2, h3, small, muted, etc.)
- `Card` - Card components (Card, CardHeader, CardContent, CardFooter)
- `Avatar` - User avatar with fallback
- `Separator` - Visual divider
- `Label` - Form labels
- `Select` - Dropdown selector

Always use these components instead of creating custom styled components.

### Import Path Resolution

The project uses baseUrl `"."` in `tsconfig.base.json`, allowing imports like:
```typescript
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
```

Components are in `components/`, utilities in `lib/`, hooks in `hooks/`.

### Metro Configuration

- Custom Metro config in `metro.config.js`
- `.mjs` files are supported via `sourceExts`
- CSS is enabled for web builds
- NativeWind CSS output configured

### New Architecture Enabled

Both iOS and Android have React Native's New Architecture enabled via `expo-build-properties` in `app.json`. This requires building development builds; the app won't run in Expo Go with native features that depend on the new architecture.

## Code Style

### Biome Configuration

The project uses Biome (v1.5.1) with custom rules:

- **Line width**: 90 characters
- **Indentation**: 2 spaces
- **Trailing commas**: ES5 style
- **JSX quotes**: Double quotes
- **Semicolons**: As needed (automatic insertion)
- **Quote style**: Single quotes
- **Console logs**: Error level (no console.log allowed in production code)

Many common linting rules are disabled to allow flexibility. Organize imports is disabled.

### TypeScript Configuration

- **Strict mode enabled** in `tsconfig.json`
- Base configuration has `strictNullChecks: true` but other strict checks are relaxed
- `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters` are all disabled in base config
- Target: ES2020
- JSX: `react-jsx` (automatic runtime)

### Styling Guidelines

**Use NativeWind classes for all styling:**

```tsx
// ✅ CORRECT - Use NativeWind className
<View className="flex-1 bg-background p-4">
  <Text className="text-lg font-bold text-foreground">Hello</Text>
</View>

// ❌ WRONG - Don't use inline styles or Tamagui
<View style={{ flex: 1, padding: 16 }}>
  <Text>Hello</Text>
</View>
```

**Use custom UI components:**

```tsx
// ✅ CORRECT - Use existing UI components
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

<Button onPress={handlePress}>
  <Text>Click me</Text>
</Button>

// ❌ WRONG - Don't create custom styled components
<Pressable style={styles.button}>
  <Text style={styles.text}>Click me</Text>
</Pressable>
```

## Important Notes

### Authentication

The app uses Supabase for authentication:
- Sign up/sign in flows in `app/(auth)/`
- Auth context in `contexts/AuthContext.tsx`
- Protected routes redirect to sign-in if not authenticated
- User session persisted with AsyncStorage

### Database

Supabase PostgreSQL database with:
- `users` - User profiles
- `items` - Items in user's library
- `friend_connections` - User friendships
- `borrow_requests` - Borrow request system

Migrations located in `supabase/migrations/`. See `SUPABASE_SETUP.md` for setup instructions.

### Toast Notifications

Toast notifications use the `burnt` library:
- Import from `@/lib/toast`
- Usage: `toast.success("Message")`, `toast.error("Error")`
- Native toasts work on iOS and Android

### Icons

Use Lucide React Native for all icons:

```tsx
import * as LucideIcons from 'lucide-react-native';

<LucideIcons.Home size={24} color="#000" />
```

### Theme Handling

The app supports dark/light mode:
- Theme context in `contexts/ThemeContext.tsx`
- System theme detection automatic
- Manual theme switcher in settings
- Use dark: prefix for dark mode styles: `className="bg-white dark:bg-black"`

### Safe Area

Always wrap screens in `SafeAreaWrapper`:

```tsx
import { SafeAreaWrapper } from '@/components/SafeAreaWrapper';

export default function Screen() {
  return (
    <SafeAreaWrapper>
      {/* Your content */}
    </SafeAreaWrapper>
  );
}
```

### Type Safety

All database types defined in `lib/types.ts`:
- `User`, `Item`, `Friend`, `BorrowRequest`, etc.
- Service functions have proper TypeScript types
- Use type imports: `import type { Item } from 'lib/types'`
