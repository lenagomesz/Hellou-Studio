import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Deployment runs can inherit NODE_ENV=production. React's production
    // build has no act(); override only the test workers, not next build/start.
    env: { NODE_ENV: 'test' },
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    exclude: ['e2e/**', 'node_modules/**', '.next/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
