import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

/**
 * E2E for the two newer reference patterns. Kept separate from demo-flow.spec.ts so
 * that file stays the one canonical journey.
 *
 * Everything here runs against the production build with mocks — see
 * playwright.config.ts. Navigate by clicking, never page.goto(), once signed in:
 * web tokens are memory-only, so a reload signs you out.
 */
async function signIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill('anisha@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Posts' })).toBeVisible();
}

test.describe('search', () => {
  test('filters, keeps typing instant, and survives navigation', async ({ page }) => {
    await signIn(page);
    const search = page.getByLabel('Search');

    await search.fill('always fails');
    // Debounced, so assert on the settled result rather than an intermediate state.
    await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(1);
    // The field shows what was typed, immediately — it is bound to the raw value.
    await expect(search).toHaveValue('always fails');

    // The term is app-local state, so it is still applied after visiting a post
    // and coming back.
    await page.getByRole('link', { name: /always fails/i }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/always fails/i);
    await page.goBack();

    await expect(page.getByLabel('Search')).toHaveValue('always fails');
    await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(1);
  });

  test('shows a no-results message, not the empty-collection one', async ({ page }) => {
    await signIn(page);

    await page.getByLabel('Search').fill('zzzz-no-such-post');

    await expect(page.getByText(/Nothing matched/i)).toBeVisible();
    await expect(page.getByText(/No posts yet/i)).toBeHidden();
  });
});

test.describe('profile', () => {
  test('conditional field, cross-field validation, and a successful save', async ({ page }) => {
    await signIn(page);

    await page.getByRole('link', { name: 'Anisha Shrestha' }).click();
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();

    // Populated from the query, not left empty by stale defaultValues.
    await expect(page.getByLabel('Display name')).toHaveValue('Anisha Shrestha');
    await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled();

    // The phone field appears only for the SMS channel.
    await expect(page.getByLabel('Phone number')).toBeHidden();
    await page.getByLabel('Notify me by').selectOption('sms');
    await expect(page.getByLabel('Phone number')).toBeVisible();

    // Cross-field rule: SMS with no number, error attached to the phone field.
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText(/Add a phone number/i)).toBeVisible();

    // Fix it and the save goes through.
    await page.getByLabel('Phone number').fill('+977 9801 234567');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Saved')).toBeVisible();
  });

  test('rejects marketing opt-in with no reachable channel', async ({ page }) => {
    await signIn(page);
    await page.getByRole('link', { name: 'Anisha Shrestha' }).click();

    // The fixture starts opted in, so choosing "do not notify" is a contradiction.
    await page.getByLabel('Notify me by').selectOption('none');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText(/Choose a channel to receive marketing/i)).toBeVisible();
  });
});
