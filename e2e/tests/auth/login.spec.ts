import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('renders login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('wrong@test.com');
    await page.getByLabel('Password', { exact: false }).fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText('Invalid email or password')).toBeVisible();
  });

  test('redirects to /admin after admin login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('digital@bce.qa');
    await page.getByLabel('Password', { exact: false }).fill('BeC@2036');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/admin/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/admin/);
  });

  test('redirects to /validator after validator login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('validator@eventpass.local');
    await page.getByLabel('Password', { exact: false }).fill('admin123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/validator/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/validator/);
  });

  test('redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('shows forgot password modal', async ({ page }) => {
    await page.goto('/login');
    await page.getByText('Forgot password?').click();
    await expect(page.getByText('Reset Password')).toBeVisible();
    await expect(page.getByText('Send Reset Link')).toBeVisible();
  });
});
