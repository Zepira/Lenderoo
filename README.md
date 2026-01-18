# Lenderoo

Never forget who borrowed your stuff! Lenderoo helps you track items you've lent to friends - books, tools, clothes, games, and more.

## What is Lenderoo?

Lenderoo is a cross-platform mobile app that solves a common problem: keeping track of items you've lent to friends. Whether it's a book, power drill, jacket, or board game, Lenderoo helps you remember who has what and when they borrowed it.

### Key Features (Planned)

- **Track Borrowed Items**: Add items you've lent out with photos, descriptions, and due dates
- **Friend Management**: Keep a list of friends and see what each person currently has
- **Reminders**: Get notified when items are overdue
- **Item History**: See the complete borrowing history for each item
- **Categories**: Organize items by type (books, tools, clothes, electronics, etc.)
- **Search**: Quickly find items or friends
- **Authentication**: Secure login to protect your data
- **Cloud Sync**: Access your data across multiple devices

## Tech Stack

- **React Native** 0.81.5 (New Architecture enabled)
- **React** 19.1.0
- **Expo** 54 with Expo Router 6 (file-based routing)
- **Tamagui** 1.138 (cross-platform UI components)
- **TypeScript** 5.9 (strict mode enabled)
- **Yarn** 4.5.0
- **Biome** (linting and formatting)
- **Jest** (testing)

### Planned Backend

- **Authentication**: Clerk or Supabase Auth
- **Database**: Supabase (PostgreSQL) or Firebase
- **Serverless Functions**: Expo Router API routes or Supabase Edge Functions
- **Storage**: Supabase Storage or Cloudinary (for item photos)

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
│   │   ├── _layout.tsx    # Tab layout configuration
│   │   ├── index.tsx      # Home screen (borrowed items list)
│   │   └── friends.tsx    # Friends list screen
│   ├── (auth)/            # Authentication flow (to be created)
│   ├── _layout.tsx        # Root layout with providers
│   ├── item/[id].tsx      # Item detail screen
│   ├── friend/[id].tsx    # Friend detail screen
│   └── +not-found.tsx     # 404 error screen
├── components/            # Reusable components
│   ├── Provider.tsx       # Tamagui & Toast providers
│   ├── ItemCard.tsx       # Item display component
│   └── FriendCard.tsx     # Friend display component
├── lib/                   # Utilities and services
│   ├── database.ts        # Database client and queries
│   ├── auth.ts            # Authentication helpers
│   └── types.ts           # TypeScript type definitions
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

## Development Roadmap

See [TODO.md](./TODO.md) for the complete development roadmap and tasks.

### Current Status

🚧 **In Development** - Setting up project foundation

### Upcoming Milestones

1. **Phase 1: Foundation** - Project setup, UI components, navigation
2. **Phase 2: Core Features** - Item tracking, friend management (local storage)
3. **Phase 3: Authentication** - User accounts and secure login
4. **Phase 4: Backend Integration** - Database, cloud sync, API
5. **Phase 5: Advanced Features** - Reminders, notifications, search
6. **Phase 6: Polish & Launch** - Testing, optimization, deployment

## Code Style

This project uses Biome for fast linting and formatting:

- **Line width**: 90 characters
- **Indentation**: 2 spaces
- **Quotes**: Single quotes (double for JSX)
- **Semicolons**: Automatic insertion
- **No console.log**: Use proper logging

## Contributing

This is currently a personal project, but contributions are welcome! Please follow these guidelines:

1. Follow the existing code style (enforced by Biome)
2. Write tests for new features
3. Update documentation as needed
4. Run `npx @biomejs/biome check --write .` before committing

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
- [Supabase Documentation](https://supabase.com/docs)

## License

MIT

---

Built with ❤️ to help friends keep track of their stuff
