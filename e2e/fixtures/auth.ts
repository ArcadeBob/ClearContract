import { test as base, type Page } from '@playwright/test';

/**
 * Authenticate via Supabase using env-var credentials.
 * Set E2E_USER_EMAIL and E2E_USER_PASSWORD in .env.local or CI secrets.
 */
async function login(page: Page) {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'E2E_USER_EMAIL and E2E_USER_PASSWORD must be set for authenticated tests'
    );
  }

  await page.goto('/');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for the authenticated app to render (sidebar appears)
  await page.getByRole('navigation').waitFor({ timeout: 15_000 });
}

/**
 * Extended test fixture that provides an authenticated page.
 */
export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    await login(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
