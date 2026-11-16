import { defineConfig } from '@playwright/test'

// UI tests in a real browser. Not part of `npm test` (Vitest); run with `npm run test:e2e`.
// Browser: by default Playwright's own Chromium (`npx playwright install chromium`). To reuse a
// Chromium-based browser already installed (e.g. Brave), set PLAYWRIGHT_CHROMIUM_PATH.
const url = 'http://localhost:5173/living-dex-app/'
// 3.39: the offline/PWA spec needs a production build (the service worker is not registered in dev), served by
// `vite preview` from its own folder (dist-e2e) with the dataset pointed at a local file the spec writes.
const previewUrl = 'http://localhost:4173/living-dex-app/'
// 3.42: the sync spec needs cloud env vars (a fake Supabase URL the spec answers itself), so it gets its own dev server.
const syncUrl = 'http://localhost:5175/living-dex-app/'

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/results',
  reporter: 'list',
  use: {
    baseURL: url,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined },
  },
  webServer: [
    { command: 'npm run dev -- --port 5173 --strictPort', url, reuseExistingServer: true, timeout: 60_000 },
    {
      command:
        'VITE_DATASET_URL=/living-dex-app/test-dataset.json npx vite build --outDir dist-e2e --emptyOutDir && npx vite preview --outDir dist-e2e --port 4173 --strictPort',
      url: previewUrl,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command:
        'VITE_SUPABASE_URL=https://example.supabase.co VITE_SUPABASE_ANON_KEY=test-anon-key npm run dev -- --port 5175 --strictPort',
      url: syncUrl,
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
  projects: [
    { name: 'desktop', testIgnore: /(pwa|sync)\.spec\.ts/, use: { viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', testIgnore: /(pwa|sync)\.spec\.ts/, use: { viewport: { width: 375, height: 812 }, hasTouch: true } },
    { name: 'sync', testMatch: /sync\.spec\.ts/, use: { baseURL: syncUrl, viewport: { width: 1280, height: 800 } } },
    { name: 'pwa', testMatch: /pwa\.spec\.ts/, use: { baseURL: previewUrl, viewport: { width: 1280, height: 800 } } },
  ],
})
