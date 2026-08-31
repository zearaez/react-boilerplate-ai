import { defineConfig } from 'vitest/config';

/**
 * Root Vitest config. Covers @repo/core, @repo/tokens and apps/web.
 * apps/mobile uses jest-expo instead (`pnpm test:mobile`) because Metro's
 * module resolution and RN's Flow-typed source need the Expo preset.
 *
 * Vitest 4 renamed `workspace` to `projects` and inlined it here — there is no
 * separate workspace file any more.
 */
export default defineConfig({
  test: {
    projects: ['packages/core', 'packages/tokens', 'apps/web'],

    // Vitest 4 shrank the default `exclude` to just node_modules and .git, so
    // every other directory has to be listed or tests get collected from dist/.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.turbo/**',
      '**/.expo/**',
      '**/coverage/**',
      // Both Playwright suites: e2e/ runs against the production preview,
      // e2e-dev/ against `vite dev`. Neither belongs to Vitest.
      '**/e2e/**',
      '**/e2e-dev/**',
      '**/.maestro/**',
      'apps/mobile/**',
    ],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',

      // REQUIRED on Vitest 4. The default is "only files loaded during the
      // run", which makes untested files invisible and every threshold pass
      // trivially. Without this line the coverage gate is theatre.
      include: [
        'packages/core/src/**/*.ts',
        'packages/tokens/src/**/*.ts',
        'apps/web/src/**/*.tsx',
        'apps/web/src/**/*.ts',
      ],

      exclude: [
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/__tests__/**',
        '**/test/**',
        '**/index.ts',
        // Entry points and vendored UI: no logic worth asserting on.
        'apps/web/src/main.tsx',
        'apps/web/src/app-runtime.ts',
        'apps/web/src/mocks/**',
        'apps/web/src/components/ui/**',
        'packages/tokens/src/index.ts',
      ],

      thresholds: {
        // Global floor, set under what the shipped tests actually achieve
        // (83.1 statements / 74.7 branches / 85.3 functions / 82.6 lines at the
        // time of writing) with enough headroom that adding a generated feature
        // does not trip it.
        //
        // A template that fails its own gate on first clone gets its thresholds
        // deleted in week one, and a floor of 0 is worse than no floor because it
        // looks like a gate. Raise these as coverage rises — `pnpm test:coverage`
        // prints the current numbers.
        lines: 75,
        functions: 78,
        statements: 76,
        branches: 68,

        // @repo/core holds all the real logic, so it carries the real bar.
        'packages/core/src/**': {
          lines: 80,
          functions: 80,
          statements: 80,
          branches: 70,
        },
      },
    },
  },
});
