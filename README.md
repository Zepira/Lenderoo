# React Native Starter

A modern React Native starter template built with Expo Router and Tamagui for cross-platform mobile, web, and desktop development.

## Features

- 🚀 **Expo Router v6** - File-based routing with typed routes
- 🎨 **Tamagui** - Cross-platform UI components with optimized styling
- ⚡ **New Architecture** - React Native's new architecture enabled for iOS and Android
- 📱 **Multi-platform** - iOS, Android, and Web support out of the box
- 🎯 **TypeScript** - Full type safety with strict mode
- 🔧 **Biome** - Fast linting and formatting
- 🧪 **Jest** - Testing setup included
- 🌙 **Dark Mode** - Automatic system theme detection

## Tech Stack

- **React Native** 0.81.5
- **React** 19.1.0
- **Expo** 54
- **Expo Router** 6
- **Tamagui** 1.138
- **TypeScript** 5.9
- **Yarn** 4.5.0

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn 4.5.0 (handled by packageManager field)
- iOS development: macOS with Xcode
- Android development: Android Studio

### Installation

```bash
# Install dependencies
yarn install

# Start development server
yarn start
```

### Run on Different Platforms

```bash
# iOS (requires macOS)
yarn ios

# Android
yarn android

# Web
yarn web
```

The development server will start with tunneling enabled for easy device testing.

## Project Structure

```
.
├── app/                    # Expo Router file-based routing
│   ├── (tabs)/            # Tab navigator group
│   │   ├── _layout.tsx   # Tab layout configuration
│   │   ├── index.tsx     # Tab 1 screen
│   │   └── two.tsx       # Tab 2 screen
│   ├── _layout.tsx        # Root layout with providers
│   ├── modal.tsx          # Modal screen example
│   └── +not-found.tsx     # 404 error screen
├── components/            # Reusable components
│   ├── Provider.tsx       # Tamagui & Toast providers
│   └── CurrentToast.tsx   # Toast implementation
├── assets/                # Images, fonts, and static files
├── tamagui.config.ts      # Tamagui theme configuration
├── babel.config.js        # Babel configuration
├── metro.config.js        # Metro bundler configuration
└── tsconfig.json          # TypeScript configuration
```

## Available Scripts

### Development
- `yarn start` - Start Expo dev server with tunnel
- `yarn ios` - Run on iOS simulator/device
- `yarn android` - Run on Android emulator/device
- `yarn web` - Run in web browser

### Testing
- `yarn test` - Run tests in watch mode

### Tamagui
- `yarn upgrade:tamagui` - Update Tamagui to latest version
- `yarn upgrade:tamagui:canary` - Update to canary version
- `yarn check:tamagui` - Validate Tamagui configuration

### Code Quality
```bash
# Format code
npx @biomejs/biome format --write .

# Lint code
npx @biomejs/biome lint .

# Check and fix
npx @biomejs/biome check --write .
```

## Configuration

### Theme & Styling

Tamagui configuration is in `tamagui.config.ts`. The app automatically adapts to system light/dark mode.

To customize themes:
1. Modify `tamagui.config.ts`
2. Run `yarn check:tamagui` to validate
3. Refer to [Tamagui configuration docs](https://tamagui.dev/docs/core/configuration)

### Routing

Expo Router uses file-based routing. To add a new screen:

1. Create a file in the `app/` directory
2. Export a React component as default
3. The route is automatically available based on the file path

Example: `app/profile.tsx` → accessible at `/profile`

### Native Toasts

Native toasts require a development build (not available in Expo Go). To enable:

1. Uncomment `'mobile'` in `components/Provider.tsx:23`
2. Build a development build: `npx expo run:ios` or `npx expo run:android`

## TypeScript

The project uses strict TypeScript with path aliases configured:

```typescript
// Import from project root
import { Provider } from 'components/Provider'
```

No need for relative paths like `../../components/Provider`.

## Code Style

This project uses Biome for fast linting and formatting:

- **Line width**: 90 characters
- **Indentation**: 2 spaces
- **Quotes**: Single quotes (double for JSX)
- **Semicolons**: Automatic insertion
- **No console.log**: Enforced (use proper logging)

## Monorepo Note

This starter was adapted from a monorepo setup. The following dependencies were moved to workspace root:
- `react`
- `react-dom`
- `react-native-web`

If using in a monorepo, ensure these are properly hoisted or referenced.

## Build & Deploy

### Development Build

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

### Production Build

```bash
# Build for app stores
eas build --platform ios
eas build --platform android

# Build for web
npx expo export --platform web
```

See [Expo EAS documentation](https://docs.expo.dev/build/introduction/) for detailed build configuration.

## Troubleshooting

### Metro bundler issues
```bash
yarn start -c  # Clear cache and restart
```

### Pod install fails (iOS)
```bash
cd ios && pod install --repo-update
```

### Android build fails
```bash
cd android && ./gradlew clean
cd .. && yarn android
```

## New Architecture

This project has React Native's New Architecture enabled for better performance. Some legacy libraries may not be compatible. Check the [React Native New Architecture documentation](https://reactnative.dev/docs/new-architecture-intro) for migration guides.

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)
- [Tamagui Documentation](https://tamagui.dev/)
- [React Native Documentation](https://reactnative.dev/)

## License

MIT
