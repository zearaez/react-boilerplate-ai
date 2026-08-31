import { defineConfig, devices } from '@playwright/test';

/**
 * E2E against the PRODUCTION BUILD with mocks enabled.
 *
 * Building rather than using the dev server is deliberate: this is the only check
 * in the repo that exercises the real bundle end to end, and the failures worth
 * catching here — Rolldown tree-shaking a class registration, a lazy route that
 * fails to resolve, MSW not being registered — only appear after a build.
 *
 * `VITE_ENABLE_MOCKS=true` means no backend is required, so this runs identically
 * on a laptop and on a CI runner.
 */
const PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // A committed `.only` would silently narrow CI to one test.
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: process.env['CI'] ? 2 : undefined,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    command: `pnpm build && pnpm exec vite preview --port ${String(PORT)} --strictPort`,
    url: `http://localhost:${String(PORT)}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
    env: {
      VITE_ENABLE_MOCKS: 'true',
      VITE_API_URL: 'http://localhost:4000',
    },
  },
});
