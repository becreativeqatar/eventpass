import { test, expect } from '@playwright/test';

test.describe('Admin role access', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('admin can access dashboard', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/);
  });

  test('admin can access records page', async ({ page }) => {
    await page.goto('/admin/records');
    await expect(page).toHaveURL(/\/admin\/records/);
  });

  test('admin can access events page', async ({ page }) => {
    await page.goto('/admin/events');
    await expect(page).toHaveURL(/\/admin\/events/);
  });

  test('admin can access scans page', async ({ page }) => {
    await page.goto('/admin/scans');
    await expect(page).toHaveURL(/\/admin\/scans/);
  });

  test('admin can access reports page', async ({ page }) => {
    await page.goto('/admin/reports');
    await expect(page).toHaveURL(/\/admin\/reports/);
  });

  test('admin can access users page', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/admin\/users/);
  });
});

test.describe('Validator role access', () => {
  test.use({ storageState: 'e2e/.auth/validator.json' });

  test('validator can access /validator', async ({ page }) => {
    await page.goto('/validator');
    await expect(page).toHaveURL(/\/validator/);
  });

  test('validator is redirected from /admin to /validator', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/validator/);
  });
});

test.describe('Unauthenticated access', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('redirects to login from /admin', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects to login from /validator', async ({ page }) => {
    await page.goto('/validator');
    await expect(page).toHaveURL(/\/login/);
  });

  test('can access public verification page', async ({ page }) => {
    await page.goto('/verify/nonexistent-token');
    // Should not redirect to login — it's a public page
    await expect(page).toHaveURL(/\/verify/);
  });
});
