import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.e2e.local', quiet: true });

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
const usesExternalServer = Boolean(process.env.E2E_BASE_URL);

export default defineConfig({
  testDir: './e2e',
  outputDir: 'test-results/e2e-artifacts',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['line'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },
  expect: { timeout: 15_000 },
  timeout: 90_000,
  webServer: usesExternalServer ? undefined : {
    // Localmente o build precisa herdar o .env.e2e.local para incorporar as
    // variáveis NEXT_PUBLIC_*. No CI o quality gate já acabou de gerar o build.
    command: process.env.CI ? 'npm run start' : 'npm run build && npm run start',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      testIgnore: /.*\.setup\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: 'test-results/.auth/user.json' },
    },
  ],
});
