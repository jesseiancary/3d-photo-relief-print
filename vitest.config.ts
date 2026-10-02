import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Vitest config is kept separate from vite.config.ts so the build (and the
// single-file artifact build) never carries test settings. Core specs run in
// the fast `node` environment by default; DOM specs opt in per-file with a
// `// @vitest-environment jsdom` pragma. Playwright specs live in e2e/ and are
// excluded here so Vitest doesn't try to run them.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/**/index.ts', // barrels: re-exports only
        'src/core/types.ts', // type-only
        'src/worker/protocol.ts', // type-only
        'src/vite-env.d.ts',
        'src/main.tsx', // app bootstrap
      ],
    },
  },
})
