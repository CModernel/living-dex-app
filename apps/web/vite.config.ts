import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig, type Plugin } from 'vitest/config'

// 3.39: stamps a build id into dist/sw.js so every deploy changes the worker's bytes (that is what makes the browser
// install the new worker and the app show "New version available").
function swBuildId(): Plugin {
  let outDir = 'dist'
  return {
    name: 'sw-build-id',
    apply: 'build',
    configResolved: (config) => void (outDir = resolve(config.root, config.build.outDir)),
    closeBundle() {
      const file = resolve(outDir, 'sw.js')
      writeFileSync(file, readFileSync(file, 'utf8').replace('__BUILD_ID__', String(Date.now())))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/living-dex-app/',
  plugins: [react(), tailwindcss(), swBuildId()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    // @cmodernel/living-dex-tiers is a `file:` dependency symlinked from outside
    // node_modules (a sibling repo). Vite's dev server treats linked packages living
    // outside node_modules as project source rather than a dependency to pre-bundle,
    // so it skips CJS→ESM interop — this plain-CJS package's `module.exports = {...}`
    // then throws "module is not defined" when served as-is to the browser. Forcing it
    // through esbuild's pre-bundling step (like a normal dependency) fixes the interop.
    include: ['@cmodernel/living-dex-tiers'],
  },
  test: {
    environment: 'jsdom',
    // Playwright specs live in e2e/ and run with `npm run test:e2e`.
    exclude: [...configDefaults.exclude, 'e2e/**'],
    globals: true,
    setupFiles: './src/test/setup.ts',
    // HomePage tests render ~1.4k-row tables in jsdom; the 5s default flakes on a busy machine.
    testTimeout: 20000,
  },
})
