import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('shows dashboard heading', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByText('Dashboard')).toBeVisible();
  });

  test('shows stats cards', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByText('Total Records')).toBeVisible();
  });

  test('shows quick action links', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByText('New Record')).toBeVisible();
  });

  test('sidebar navigation is visible', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByText('EventPass')).toBeVisible();
  });
});
