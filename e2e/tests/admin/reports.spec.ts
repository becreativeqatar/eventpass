import { test, expect } from '@playwright/test';

test.describe('Reports Page', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('shows reports page', async ({ page }) => {
    await page.goto('/admin/reports');
    await expect(page.getByText(/report/i)).toBeVisible();
  });
});
