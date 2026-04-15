/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/roll-probability/',
  test: {
    include: ['src/__tests__/**/*.test.ts'],
    environment: 'happy-dom',
    coverage: {
      reportsDirectory: '.coverage',
    },
  },
});
