# Living Dex App

Web and mobile app for tracking a Pokémon Living Dex. Built with React 19 (web) and React Native + Expo (mobile), sharing business logic through a TypeScript monorepo.

## Structure

```
living-dex-app/
├── apps/
│   ├── web/         React 19 + Vite + Tailwind (GitHub Pages)
│   └── mobile/      React Native + Expo (iOS + Android)
├── packages/
│   └── business-logic/  Shared types, data fetching, storage abstractions
└── TODO.md          Macro roadmap (Phase 1-3)
```

## Data

The dataset (1387 Pokémon entries) is generated and maintained in the sibling
[`living-dex-organizer`](https://github.com/CModernel/living-dex-organizer) repo,
published via jsDelivr CDN. Both web and mobile apps fetch it at runtime (no bundling).

## Development

**Prerequisites:** Node.js 18+, npm/yarn

```bash
npm install                    # Install monorepo dependencies
npm run build -w apps/web      # Build web app
npm run dev -w apps/web        # Start web dev server (localhost:5182)
npm run start -w apps/mobile   # Start Expo dev server
npm run test -w apps/web       # Run tests
```

## Roadmap

See `TODO.md` for the full implementation roadmap:
- **Phase 1** — Setup & Plataforms (in progress: 1.2 Dataset fetching done)
- **Phase 2** — Structures & Basics (routing, theme, storage wiring)
- **Phase 3** — Features (#20 table, #16 lists, #14 filtering, etc.)

## Deployment

**Web:** Deployed to GitHub Pages via GitHub Actions. See `.github/workflows/deploy-web.yml` once configured.

**Mobile:** Builds via Expo EAS or local Xcode/Android Studio.

## License

MIT — see `LICENSE` file.
