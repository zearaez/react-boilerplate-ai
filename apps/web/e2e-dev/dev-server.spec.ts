import { expect, test } from '@playwright/test';

/**
 * THE DEV-SERVER SMOKE TEST.
 *
 * Everything else in this repo runs against the production build: `vite build` for
 * the bundle assertions, `vite preview` for the journey specs, Node for Vitest. That
 * left `vite dev` — the environment developers use all day — as the one surface with
 * no gate on it at all. A dev-only breakage (a stale optimize cache, a dep that only
 * misbehaves unbundled, a plugin that only runs in serve mode) could ship with CI
 * fully green.
 *
 * These specs are deliberately shallow; the journey is covered in e2e/. They ask
 * three things: does the app boot in dev, does anything Node-only leak into the
 * browser, and does logger output actually reach the console.
 */
test('the app boots in `vite dev` with no uncaught errors', async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on('pageerror', (error) => pageErrors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/');

  // Reaching the login screen proves the whole import graph evaluated: app-runtime,
  // @repo/core, i18n, the router and MSW.
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

  expect(pageErrors, `Uncaught error in dev:\n${pageErrors.join('\n')}`).toHaveLength(0);
  expect(consoleErrors, `console.error in dev:\n${consoleErrors.join('\n')}`).toHaveLength(0);
});

test('no Node-only global leaks into the browser', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

  // Asserting `process` stays absent is what stops the real fix — core not sniffing
  // its environment — from regressing behind a bundler that papers over it in one
  // mode but not the other.
  expect(await page.evaluate(() => typeof process)).toBe('undefined');
});

test('logger output reaches the browser console in dev', async ({ page }) => {
  const messages: string[] = [];
  page.on('console', (message) => messages.push(message.text()));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

  // main.tsx logs one line at debug on a successful boot. Asserting on it covers the
  // whole chain end to end — configureLogger() picked a dev level, the console
  // transport is installed, and @repo/core's logger really does print in a browser —
  // using the app's own code rather than a stub reaching into the module graph.
  expect(
    messages.some((message) => message.includes('Web app booted')),
    `Expected the boot log line in the console. Saw:\n${messages.join('\n')}`,
  ).toBe(true);

  // Pretty format in dev, not JSON: the level prefix is what makes it scannable.
  expect(messages.some((message) => message.startsWith('[debug] Web app booted'))).toBe(true);
});
