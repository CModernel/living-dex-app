import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  base: '/living-dex-app/',
  plugins: [react(), tailwindcss()],
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
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
