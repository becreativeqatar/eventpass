import { test, expect } from '@playwright/test';

test.describe('Validator Scanner', () => {
  test.use({ storageState: 'e2e/.auth/validator.json' });

  test('shows scanner page', async ({ page }) => {
    await page.goto('/validator');
    await expect(page.getByText(/scan|scanner|qr/i)).toBeVisible();
  });

  test('shows phase selector', async ({ page }) => {
    await page.goto('/validator');
    await expect(page.getByText(/bump.?in|live|bump.?out/i)).toBeVisible();
  });
});
