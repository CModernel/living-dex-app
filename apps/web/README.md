# Living Dex Web

Web app for tracking a Pokémon Living Dex — lets a user mark which entries they own
across one or more custom lists (see `docs/PLANNING.md` in the sibling
[`living-dex-organizer`](../living-dex-organizer) repo for the full user-state data
model this app implements).

This repo is only the app. The dataset itself (`living-form-full-data.json`) and the
curated tier logic (`@cmodernel/living-dex-tiers`) are built and versioned in
`living-dex-organizer`, a separate repo that lives alongside this one — this app
consumes the dataset via the jsDelivr CDN URL documented in that repo's README,
rather than importing it locally.

## Stack

- React 19 + Vite
- TypeScript
- Tailwind CSS v4
- Vitest + Testing Library
- TanStack Table (for the main spreadsheet-style view, TODO #20)

## Development

```bash
npm install
npm run dev      # start the dev server
npm test         # run unit tests
npm run build    # typecheck + production build
```
