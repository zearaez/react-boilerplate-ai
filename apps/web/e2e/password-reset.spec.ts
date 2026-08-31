import { expect, test } from '@playwright/test';

/**
 * The reset journey against the production bundle with MSW.
 *
 * Worth an e2e of its own rather than folding into demo-flow.spec.ts: both pages
 * are LAZY routes, and a lazy route that fails to resolve in the real bundle is
 * invisible to every unit test — the component-level specs import the page
 * directly. This is also the only place the link out of the login form and the
 * `?token=` prefill are exercised through a real navigation.
 *
 * `reset-code-user-1` is the code the mock issues for the demo account; it is the
 * same value the reset screen hints at, and packages/core's mock-contract test
 * keeps the two in step.
 */
const DEMO_EMAIL = 'anisha@example.com';
const DEMO_PASSWORD = 'password123';
const RESET_CODE = 'reset-code-user-1';
const NEW_PASSWORD = 'a-brand-new-password';

test('the full reset journey: request a code, set a new password, sign in with it', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByRole('link', { name: /forgot your password/i }).click();

  await expect(page).toHaveURL(/\/forgot-password$/);
  await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();

  await page.getByLabel('Email').fill(DEMO_EMAIL);
  await page.getByRole('button', { name: 'Send reset code' }).click();

  // Never "we sent you an email": the endpoint answers the same way for an address
  // with no account, and the copy must not claim more than that.
  await expect(page.getByRole('status')).toContainText(/if an account exists/i);

  await page.getByRole('link', { name: 'I have a code' }).click();
  await expect(page).toHaveURL(/\/reset-password$/);

  await page.getByLabel('Reset code').fill(RESET_CODE);
  await page.getByLabel('New password', { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel('Confirm new password').fill('a-different-password');
  await page.getByRole('button', { name: 'Update password' }).click();

  // The cross-field rule from @repo/core, enforced in the real bundle.
  await expect(page.getByText(/passwords do not match/i)).toBeVisible();

  await page.getByLabel('Confirm new password').fill(NEW_PASSWORD);
  await page.getByRole('button', { name: 'Update password' }).click();

  // Not signed in — a reset link buys one password change, not a session.
  await expect(page.getByRole('heading', { name: 'Password updated' })).toBeVisible();
  await page.getByRole('link', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/login$/);

  // The old password is genuinely gone.
  await page.getByLabel('Email').fill(DEMO_EMAIL);
  await page.getByLabel('Password').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toContainText(/invalid email or password/i);

  await page.getByLabel('Password').fill(NEW_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Posts' })).toBeVisible();
});

test('a code the backend never issued is rejected on the code field', async ({ page }) => {
  // Straight to /reset-password with no request first — a link someone kept from
  // an old email, or guessed.
  await page.goto(`/reset-password?token=${RESET_CODE}`);

  await expect(page.getByLabel('Reset code')).toHaveValue(RESET_CODE);

  await page.getByLabel('New password', { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel('Confirm new password').fill(NEW_PASSWORD);
  await page.getByRole('button', { name: 'Update password' }).click();

  await expect(page.getByText(/not valid any more/i)).toBeVisible();
});
