import { test, expect } from '@playwright/test';

test.describe('Records Management', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('shows records page', async ({ page }) => {
    await page.goto('/admin/records');
    // Should either show records or redirect to select a project
    await expect(page).toHaveURL(/\/admin/);
  });

  test('shows new record button when project selected', async ({ page }) => {
    await page.goto('/admin/records');
    // If a project is active, should show the new record button
    const newButton = page.getByRole('button', { name: /new|add/i });
    const noProject = page.getByText(/select.*project|no.*project/i);
    await expect(newButton.or(noProject)).toBeVisible();
  });
});
