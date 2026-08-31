import { expect, test } from '@playwright/test';

import { colors } from '@repo/tokens';

import type { Page } from '@playwright/test';

/**
 * The one end-to-end path through the app, against the production bundle with MSW.
 *
 * This is the only check in the repo that would notice the app being broken while
 * every unit test still passes — a lazy route that fails to resolve, MSW not
 * registering, a Tailwind class tree-shaken out of the build, the auth guard
 * looping. Unit tests cannot see any of those.
 *
 * Deliberately ONE long journey rather than many isolated specs: the value here is
 * "can a user get from sign-in to a deleted post", and splitting that into six
 * specs would just re-run sign-in six times.
 */
const DEMO_EMAIL = 'anisha@example.com';
const DEMO_PASSWORD = 'password123';

async function signIn(page: Page) {
  await page.goto('/');
  // The guard should bounce an unauthenticated visitor to /login.
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel('Email').fill(DEMO_EMAIL);
  await page.getByLabel('Password').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('heading', { name: 'Posts' })).toBeVisible();
}

test('unauthenticated visitors are sent to the login screen', async ({ page }) => {
  await page.goto('/posts/post-001');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});

test('rejects bad credentials without signing in', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill(DEMO_EMAIL);
  await page.getByLabel('Password').fill('definitely-wrong');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('alert')).toContainText(/invalid email or password/i);
  await expect(page).toHaveURL(/\/login$/);
});

test('the styles from the build actually applied', async ({ page }) => {
  await page.goto('/login');
  const button = page.getByRole('button', { name: 'Sign in' });

  // If Tailwind were purged or tree-shaken out of the production bundle, the
  // button would render with a transparent background. This is the assertion that
  // catches a styling regression that every unit test would miss.
  const background = await button.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(background).not.toBe('rgba(0, 0, 0, 0)');
  expect(background).not.toBe('transparent');

  // And the token is really a CSS custom property, not a hardcoded colour.
  //
  // Compared against packages/tokens rather than a literal: this assertion is
  // "the generated CSS matches the token source", and hardcoding the triplet
  // here made it "the brand colour is still the old one" — which is a test that
  // fails on every rebrand for no reason, and had to be edited to ship this one.
  const primary = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),
  );
  expect(primary).toBe(colors.light.primary);
});

test('the session survives a hard reload', async ({ page }) => {
  // The regression guard for persisted web sessions. Until this shipped, web
  // storage was memory-only and a reload signed the user out — so this test is
  // the difference between that being a deliberate change and an accident.
  //
  // It exercises the whole chain against the production bundle: localStorage
  // write on sign-in, a full page load, hydrate() reading it back, and the auth
  // guard letting the user through without a network round trip to /login.
  await signIn(page);

  await page.reload();

  await expect(page.getByRole('heading', { name: 'Posts' })).toBeVisible();
  await expect(page).not.toHaveURL(/\/login$/);

  // Signing out must clear it, or the next visitor to this browser inherits the
  // session — the failure mode that makes persistence worse than not having it.
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
});

test('the full demo journey: sign in, paginate, create, edit, delete, sign out', async ({
  page,
}) => {
  await signIn(page);

  // --- pagination -----------------------------------------------------------
  //
  // Scoped to <main>: the sidebar navigation is a list too, so a page-wide
  // listitem count silently includes it and reads "13" for a page of 10.
  await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(10);
  await expect(page.getByText('48 posts')).toBeVisible();

  await page.getByRole('button', { name: 'Load more' }).click();
  await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(20);

  // --- create ---------------------------------------------------------------
  await page.getByRole('link', { name: 'New post' }).click();
  await expect(page).toHaveURL(/\/posts\/new$/);

  await page.getByLabel('Title').fill('An end-to-end post');
  await page.getByLabel('Body').fill('Created by the Playwright demo-flow spec.');
  await page.getByRole('button', { name: 'Create post' }).click();

  // Lands on the detail route for the new record.
  await expect(page).toHaveURL(/\/posts\/post-\d+$/);
  await expect(page.getByRole('heading', { name: 'An end-to-end post' })).toBeVisible();
  // Defaults to a draft because `published` is unchecked.
  await expect(page.getByText('Draft')).toBeVisible();

  // --- edit -----------------------------------------------------------------
  await page.getByRole('link', { name: 'Edit' }).click();
  await page.getByLabel('Title').fill('An edited end-to-end post');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByRole('heading', { name: 'An edited end-to-end post' })).toBeVisible();

  // --- delete ---------------------------------------------------------------
  await page.getByRole('button', { name: 'Delete' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Delete' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Posts' })).toBeVisible();

  // --- sign out -------------------------------------------------------------
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('the optimistic update rolls back when the server rejects the save', async ({ page }) => {
  await signIn(page);

  // Navigate by CLICKING, never page.goto(), once signed in. Web tokens are
  // memory-only by design (see docs/security-and-privacy.md), so a full page load
  // signs the user out — a goto() here would silently test the login screen.
  //
  // `post-fail` is seeded first in the fixture list and always returns 500 from
  // PATCH, precisely so this path is reachable. A rollback nobody can trigger is a
  // rollback nobody knows is broken.
  await page.getByRole('link', { name: /always fails/i }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/always fails/i);

  await page.getByRole('link', { name: 'Edit' }).click();

  const title = page.getByLabel('Title');
  await expect(title).toHaveValue(/always fails/i);
  await title.fill('This must never persist');
  await page.getByRole('button', { name: 'Save' }).click();

  // The server error surfaces and we stay put.
  await expect(page.getByRole('alert')).toContainText(/always fails to save/i);
  await expect(page).toHaveURL(/\/posts\/post-fail\/edit$/);

  // The rollback is the point: going back to the detail view must show the
  // ORIGINAL title, not the optimistic one.
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/always fails/i);
  await expect(page.getByText('This must never persist')).toBeHidden();
});
