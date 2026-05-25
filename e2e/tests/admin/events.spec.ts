import { test, expect } from '@playwright/test';

test.describe('Events Management', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('lists events', async ({ page }) => {
    await page.goto('/admin/events');
    await expect(page.getByText('Events')).toBeVisible();
  });

  test('shows create event button', async ({ page }) => {
    await page.goto('/admin/events');
    await expect(page.getByRole('button', { name: /new|create/i })).toBeVisible();
  });
});
