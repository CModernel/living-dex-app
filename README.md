# Living Dex App

Web and mobile app for tracking a Pokémon Living Dex — mark which entries you own across one or
more custom lists, filtered by tier (Living Form, Living Lite, Final Form Full, Final Form).
TypeScript monorepo sharing business logic between a React 19 web app and a React Native + Expo
mobile app.

This repo is only the app. The dataset and tier predicates (`@cmodernel/living-dex-tiers`) are
built and versioned in the sibling
[`living-dex-organizer`](https://github.com/CModernel/living-dex-organizer) repo, checked out
alongside this one.

## Structure

```
living-dex-app/
├── apps/
│   ├── web/                 React 19 + Vite + Tailwind v4 (GitHub Pages)
│   └── mobile/                React Native + Expo SDK 54 (iOS/Android via Expo Go)
├── packages/
│   └── business-logic/         Shared types, dataset fetching, storage abstraction
├── TODO.md                      Phase-by-phase roadmap and implementation history
└── docs/RULES.md                 Working rules for AI assistants in this repo
```

## Stack

| | Web | Mobile |
|---|---|---|
| UI | React 19.1.0 | React 19.1.0 + React Native 0.81.5 |
| Routing | react-router v7 | React Navigation v7 (bottom tabs) |
| Styling | Tailwind CSS v4 (dark mode) | `ThemeContext` (mirrors web's color tokens) |
| Tests | Vitest + Testing Library | Jest (`jest-expo`) + Testing Library |
| Storage | `localStorage` adapter | `AsyncStorage` adapter |

**React is pinned to one exact version (`19.1.0`) everywhere in this monorepo** — `react-native`'s
bundled renderer requires an exact match, and letting it drift broke hooks at runtime (see
`TODO.md`'s 2.2). Don't loosen this without re-reading that first.

## Development

**Prerequisites:** Node.js 20.19+/22.12+, `living-dex-organizer` checked out as a sibling
directory, Expo Go on a physical device for mobile.

```bash
npm install                       # from repo root, installs all workspaces

npm run dev -w apps/web           # web dev server
npm run start -w apps/mobile      # mobile dev server (scan QR with Expo Go)

npm run test                      # all workspaces' tests
npm run build:web                 # typecheck + production build
```

## Roadmap

See `TODO.md` for the full history. **Phase 1** (setup) and **Phase 2** (routing/theme/storage
scaffolding) are done. **Phase 3** (features) is in progress — the main table (#20) works with
real data and persistence; tier selector, customizable columns, lists, and filtering are next.

## Deployment

**Web:** automatic — pushes to `main` deploy to GitHub Pages via
`.github/workflows/deploy-web.yml`. **Mobile:** not yet deployed; developed via Expo Go.

## License

MIT — see `LICENSE` file.
