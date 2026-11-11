import { defineConfig } from '@playwright/test'

// UI tests in a real browser. Not part of `npm test` (Vitest); run with `npm run test:e2e`.
// Browser: by default Playwright's own Chromium (`npx playwright install chromium`). To reuse a
// Chromium-based browser already installed (e.g. Brave), set PLAYWRIGHT_CHROMIUM_PATH.
const url = 'http://localhost:5173/living-dex-app/'

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/results',
  reporter: 'list',
  use: {
    baseURL: url,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined },
  },
  webServer: { command: 'npm run dev -- --port 5173 --strictPort', url, reuseExistingServer: true, timeout: 60_000 },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { viewport: { width: 375, height: 812 }, hasTouch: true } },
  ],
})
