import { defineConfig } from 'vitest/config'

// Single-package repository: specs live at src/**/spec/**, not the monorepo
// packages/*/src/**/spec/** layout assumed by @ariestools/vitest-config.
export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['**/dist/**', '**/node_modules/**'],
    globals: true,
    include: ['src/**/spec/**/*.spec.ts'],
    watch: false,
  },
})
