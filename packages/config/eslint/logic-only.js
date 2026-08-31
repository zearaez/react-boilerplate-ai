import tseslint from 'typescript-eslint';

import { baseConfig } from './base.js';

/**
 * For @repo/core: platform-agnostic logic, no JSX, no platform APIs.
 *
 * This config IS the package boundary. `nodeLinker: hoisted` means core can
 * physically resolve `react-native` and touch `window` — only the linter stops
 * it. Keep this list byte-consistent with docs/architecture/monorepo-graph.md,
 * or agents will trust the diagram over the linter and lose.
 *
 * @param {object} options
 * @param {string} options.tsconfigRootDir
 */
export function logicOnlyConfig({ tsconfigRootDir }) {
  return tseslint.config(
    ...baseConfig({ tsconfigRootDir }),

    // Platform bans apply EVERYWHERE, including tests. Core must never touch a
    // platform API, and a test that does would be testing the wrong thing.
    {
      files: ['src/**/*.ts', 'src/**/*.tsx'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: 'react-dom',
                message: '@repo/core is platform-agnostic. DOM rendering belongs in apps/web.',
              },
            ],
            patterns: [
              {
                group: [
                  'react-native',
                  'react-native/*',
                  'react-native-*',
                  'expo',
                  'expo-*',
                  '@expo/*',
                  'nativewind',
                  '@repo/tokens',
                  '@repo/tokens/*',
                ],
                message:
                  '@repo/core is platform-agnostic logic. Inject platform behaviour through CoreRuntime (src/runtime.ts) instead — see docs/architecture/monorepo-graph.md.',
              },
            ],
          },
        ],
        'no-restricted-globals': [
          'error',
          {
            name: 'window',
            message:
              '@repo/core runs on Hermes too. Put DOM access in apps/web and pass it in via configureCore().',
          },
          {
            name: 'document',
            message: '@repo/core runs on Hermes too. DOM access belongs in apps/web.',
          },
          { name: 'localStorage', message: 'Use the CoreStorage adapter from configureCore().' },
          { name: 'sessionStorage', message: 'Use the CoreStorage adapter from configureCore().' },
          { name: 'navigator', message: 'Not available on Hermes. Inject it via configureCore().' },
          {
            name: 'process',
            message:
              'Does not exist on Hermes or in a browser. Bundler `define` may paper over process.env.NODE_ENV, but @repo/core is not owned by any one bundler. Let the app tell core its environment: configureLogger() / configureCore().',
          },
        ],
      },
    },

    // @repo/mocks is the fake BACKEND. Production code in core must never reach
    // for it — but tests must, because that is how they get a server to talk to.
    {
      files: ['src/**/*.ts', 'src/**/*.tsx'],
      ignores: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/__tests__/**', 'src/test/**'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@repo/mocks', '@repo/mocks/*'],
                message:
                  '@repo/mocks is a test/dev fixture package. Shipping it from @repo/core would bundle the fake backend into production.',
              },
            ],
          },
        ],
      },
    },

    // No JSX in core. src/test/render-hook.tsx is the single, deliberate
    // exception — a QueryClientProvider wrapper that never ships to an app.
    {
      files: ['src/**/*.tsx'],
      ignores: ['src/test/**'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector: 'Program',
            message:
              '@repo/core must not contain JSX. Components live in apps/web/src or apps/mobile/components.',
          },
        ],
      },
    },
  );
}
