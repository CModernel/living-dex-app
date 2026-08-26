# Living Dex Web

Web app for tracking a Pokémon Living Dex. See the root `README.md` for the full monorepo picture
— this file covers only what's specific to `apps/web`.

The dataset and tier predicates (`@cmodernel/living-dex-tiers`) live in the sibling
`living-dex-organizer` repo — fetched from jsDelivr CDN at runtime, and imported as a `file:`
dependency, respectively.

## Stack

React 19 + Vite 8, TypeScript, Tailwind CSS v4, react-router v7, Vitest + Testing Library.

The main table (`src/pages/HomePage.tsx`) uses a plain HTML `<table>`, not TanStack Table
(installed but not needed yet — introduced once customizable columns, `TODO.md` 3.4, needs its
column-visibility API).

## Development

```bash
npm install
npm run dev      # dev server
npm test         # unit + UI tests
npm run build    # typecheck + production build
```
