/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/roll-probability/',
  test: {
    include: ['__tests__/**/*.test.ts'],
    environment: 'happy-dom',
    setupFiles: ['fake-indexeddb/auto'],
    coverage: {
      reportsDirectory: '.coverage',
    },
  },
});
