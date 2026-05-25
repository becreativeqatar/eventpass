import { test, expect } from '@playwright/test';

test.describe('Users Management (Admin)', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('shows users list', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.getByText('Users')).toBeVisible();
  });

  test('shows create user button', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.getByRole('button', { name: /new|add|create/i })).toBeVisible();
  });

  test('lists existing users', async ({ page }) => {
    await page.goto('/admin/users');
    // Should show the seeded users
    await expect(page.getByText('digital@bce.qa').or(page.getByText('BCE Admin'))).toBeVisible();
  });
});

test.describe('Users Management (Manager)', () => {
  test.use({ storageState: 'e2e/.auth/manager.json' });

  test('manager cannot access users page', async ({ page }) => {
    await page.goto('/admin/users');
    // Should either redirect or show forbidden
    const forbidden = page.getByText(/forbidden|access denied|not authorized/i);
    const redirected = page.getByText('Dashboard');
    await expect(forbidden.or(redirected)).toBeVisible();
  });
});
