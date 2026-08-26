# Living Dex Mobile

React Native + Expo app for tracking a Pokémon Living Dex on iOS/Android. See the root
`README.md` for the full monorepo picture — this file covers only what's specific to
`apps/mobile`.

## Stack

- Expo SDK **~54.0.33**, pinned deliberately — the last SDK with a store-downloadable Expo Go
  client. Don't bump without verifying Expo Go compatibility on a real device.
- React 19.1.0 + React Native 0.81.5, **exact** versions (see root `README.md`).
- React Navigation v7 (bottom tabs) — not Expo Router (removed during the SDK 57→54 migration).
- Jest (`jest-expo` preset) + `@testing-library/react-native@^12.x` (not `^14.x` — breaks
  `render()`'s queries with this setup; see `TODO.md`'s 2.6).

## Development

**Prerequisites:** Expo Go on a physical device, same Wi-Fi as your dev machine.

```bash
npm install
npx expo start      # start dev server, scan QR with Expo Go
npm test             # run tests
```

## Project layout

```
apps/mobile/
├── App.tsx              Providers (SafeArea, Theme, UserState) + RootNavigator
└── src/
    ├── navigation/         Bottom tabs
    ├── screens/             Home / Lists / Settings
    ├── state/               UserStateContext (AsyncStorage-backed)
    └── theme/                ThemeContext (mirrors web's color tokens)
```

Before bumping any Expo-related dependency, see `AGENTS.md` and `TODO.md`'s Phase 1/2 entries —
there's a real history of version-mismatch bugs here that only show up at runtime, not at build
time.
