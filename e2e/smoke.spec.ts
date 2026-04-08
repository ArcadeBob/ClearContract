import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('app loads and shows login page', async ({ page }) => {
    await page.goto('/');

    // Wait for auth loading to finish and login form to appear
    await expect(page.getByLabel('Email')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'ClearContract' })).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByLabel('Email')).toBeVisible({ timeout: 15_000 });
    await page.getByLabel('Email').fill('invalid@example.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });
  });
});
