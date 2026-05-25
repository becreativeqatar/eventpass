import { test, expect } from '@playwright/test';

test.describe('Scans Page', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('shows scan history page', async ({ page }) => {
    await page.goto('/admin/scans');
    await expect(page.getByText(/scan/i)).toBeVisible();
  });
});
