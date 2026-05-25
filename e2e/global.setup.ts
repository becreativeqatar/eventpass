import { chromium, type FullConfig } from '@playwright/test';

const USERS = [
  { file: 'e2e/.auth/admin.json', email: 'digital@bce.qa', password: 'BeC@2036' },
  { file: 'e2e/.auth/manager.json', email: 'manager@eventpass.local', password: 'admin123' },
  { file: 'e2e/.auth/staff.json', email: 'staff@eventpass.local', password: 'admin123' },
  { file: 'e2e/.auth/validator.json', email: 'validator@eventpass.local', password: 'admin123' },
];

async function globalSetup(_config: FullConfig) {
  const browser = await chromium.launch();

  for (const user of USERS) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('http://localhost:3000/login');
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password', { exact: false }).fill(user.password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/(admin|validator)/, { timeout: 15_000 });
    await context.storageState({ path: user.file });
    await context.close();
  }

  await browser.close();
}

export default globalSetup;
