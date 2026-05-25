import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /global\.setup\.ts/ },
    {
      name: 'admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/admin.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'manager',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/manager.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'staff',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/staff.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'validator',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/validator.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'unauthenticated',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: process.env.CI ? 'npm start' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
