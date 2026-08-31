import { defineConfig, devices } from '@playwright/test';

/**
 * A SECOND Playwright config, pointed at `vite dev`.
 *
 * playwright.config.ts builds and previews, which is right for the journey specs —
 * but it meant the dev server was the one surface nothing exercised, so a dev-only
 * failure could ship with CI green.
 *
 * Kept as a separate config rather than a second project so the production suite is
 * unaffected and this one can be run alone: `pnpm test:e2e:dev`. It is fast (~3s)
 * because it only boots the app.
 */
const PORT = 5174;

export default defineConfig({
  testDir: './e2e-dev',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  workers: 1,
  reporter: process.env['CI'] ? [['github']] : [['list']],

  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    trace: 'on-first-retry',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    // `vite`, not `vite preview` — that is the entire point of this config.
    command: `pnpm exec vite --port ${String(PORT)} --strictPort`,
    url: `http://localhost:${String(PORT)}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
    env: {
      VITE_ENABLE_MOCKS: 'true',
      VITE_API_URL: 'http://localhost:4000',
    },
  },
});
