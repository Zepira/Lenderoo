# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React Native starter project using Expo Router with Tamagui for UI components. The project uses Yarn 4.5.0 as the package manager and is configured with React Native's New Architecture enabled for both iOS and Android.

**Key Technologies:**
- **Expo Router** (v6) for file-based routing
- **Tamagui** (v1.138) for cross-platform UI components and styling
- **React Native** 0.81.5 with React 19.1.0
- **TypeScript** with strict mode enabled
- **Biome** for linting and formatting
- **Jest** for testing

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

### Tamagui Management
```bash
# Upgrade Tamagui packages to latest
yarn upgrade:tamagui

# Upgrade Tamagui packages to canary
yarn upgrade:tamagui:canary

# Check Tamagui configuration
yarn check:tamagui
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

- **`app/_layout.tsx`**: Root layout that wraps the entire app with providers (Tamagui, Toast, React Navigation themes)
- **`app/(tabs)/_layout.tsx`**: Tab navigator layout with two tabs
- **`app/(tabs)/index.tsx`**: First tab (Tab One)
- **`app/(tabs)/two.tsx`**: Second tab (Tab Two)
- **`app/modal.tsx`**: Modal screen accessible via `/modal` route
- **`app/+not-found.tsx`**: 404 error screen
- **`app/+html.tsx`**: Custom HTML template for web

### Provider Hierarchy

The app is wrapped in multiple providers in this order (see `app/_layout.tsx` and `components/Provider.tsx`):

1. **TamaguiProvider**: Provides Tamagui theme configuration and responds to system color scheme
2. **ToastProvider**: Enables toast notifications (native toasts disabled by default in Expo Go)
3. **React Navigation ThemeProvider**: Applies dark/light theme to navigation
4. **StatusBar**: Configured based on color scheme

### Tamagui Configuration

- Configuration lives in `tamagui.config.ts` (uses default config from `@tamagui/config/v4`)
- Web styles are extracted to `tamagui-web.css` via Metro plugin
- Babel plugin is configured to optimize Tamagui components (extraction disabled in development)
- The Tamagui babel plugin MUST come before `react-native-reanimated/plugin` in `babel.config.js`

### Import Path Resolution

The project uses baseUrl `"."` in `tsconfig.base.json`, allowing imports like:
```typescript
import { Provider } from 'components/Provider'
```

Components are in the `components/` directory, app routes in `app/`.

### Metro Configuration

- Custom Metro config in `metro.config.js` wraps Expo's default config with `withTamagui`
- `.mjs` files are supported via `sourceExts`
- CSS is enabled for web builds
- Tamagui Metro plugin extracts CSS for web

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

## Important Notes

### Monorepo Consideration

Per the README, this project was adapted for a monorepo and had to remove `react`, `react-dom`, and `react-native-web` dependencies with metro.config.js adjustments. If extending this starter, be aware of potential dependency hoisting issues.

### Toast Notifications

Native toasts require a development build and won't work in Expo Go. To enable native toasts on mobile, uncomment `'mobile'` in the `native` array in `components/Provider.tsx:23`.

### Reanimated Plugin Order

The `react-native-reanimated/plugin` MUST be the last plugin in `babel.config.js` as noted in the comment.

### Font Loading

The app loads Inter fonts (Medium and Bold variants) and prevents splash screen auto-hide until fonts are loaded or an error occurs (see `app/_layout.tsx`).

### Theme Handling

The app automatically responds to system color scheme changes. Tamagui theme is synchronized with React Navigation's theme provider.
