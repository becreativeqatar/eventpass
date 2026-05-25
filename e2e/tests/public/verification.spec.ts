import { test, expect } from '@playwright/test';

test.describe('Public Verification Page', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('shows error for invalid token', async ({ page }) => {
    await page.goto('/verify/invalid-token-xyz');
    await expect(page.getByText(/not found|invalid|error/i)).toBeVisible();
  });

  test('does not redirect to login', async ({ page }) => {
    await page.goto('/verify/some-token');
    await expect(page).toHaveURL(/\/verify/);
  });
});
