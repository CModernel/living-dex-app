# Expo SDK version

This app is pinned to **Expo SDK ~54.0.33**, deliberately — SDK 54 is the last version with a
public, App Store/Play Store-downloadable Expo Go client. Read the versioned docs at
https://docs.expo.dev/versions/v54.0.0/ before writing any code, not the `latest` docs — later
SDK docs describe APIs/behavior that may not match what's actually installed here.

Before bumping any Expo-related dependency (`expo`, `expo-*`, `react-native`, `react`,
`babel-preset-expo`, `@react-navigation/*`, `react-native-screens`, etc.), see `README.md`'s
"Known constraints" section and `TODO.md`'s Phase 1/2 entries — there's a real history of
version-mismatch bugs here that a bundle export alone won't catch (verify on a physical device).
