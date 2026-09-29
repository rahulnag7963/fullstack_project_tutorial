import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm start -w server',
      // Answers 401 without a token, which Playwright counts as "ready".
      url: 'http://localhost:3001/api/todos',
      reuseExistingServer: true,
    },
    {
      command: 'npm run dev -w client',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
    },
  ],
});
