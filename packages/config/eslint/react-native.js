import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

import { baseConfig, RESTRICTED_SYNTAX } from './base.js';

/**
 * For apps/mobile: Expo SDK 57 + expo-router + NativeWind 4.
 *
 * @param {object} options
 * @param {string} options.tsconfigRootDir
 */
export function reactNativeConfig({ tsconfigRootDir }) {
  return tseslint.config(
    ...baseConfig({ tsconfigRootDir }),

    {
      files: ['**/*.{ts,tsx}'],
      languageOptions: {
        globals: {
          __DEV__: 'readonly',
          fetch: 'readonly',
          console: 'readonly',
          setTimeout: 'readonly',
          clearTimeout: 'readonly',
          setInterval: 'readonly',
          clearInterval: 'readonly',
          requestAnimationFrame: 'readonly',
          cancelAnimationFrame: 'readonly',
        },
      },
      extends: [reactHooks.configs.flat.recommended],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@react-navigation/*', '@react-navigation'],
                message:
                  'expo-router forked away from React Navigation in SDK 56 — these imports resolve to a different copy of the navigator and break at runtime. Use expo-router (Stack, Tabs, Link, useRouter, Stack.Protected).',
              },
              {
                group: ['react-router', 'react-router/*', 'react-router-dom'],
                message: 'This is the mobile app. Routing is expo-router.',
              },
            ],
          },
        ],
        // Styling is NativeWind className, in one place, always.
        'no-restricted-properties': [
          'error',
          {
            object: 'StyleSheet',
            property: 'create',
            message:
              'Use NativeWind `className` instead. If you genuinely need an imperative style (rare: animated values, measured layout), add it to lib/ with a comment explaining why.',
          },
        ],
      },
    },

    {
      // Tests excluded explicitly — see the equivalent note in react-web.js.
      files: ['app/**/*.tsx', 'components/*.tsx'],
      ignores: ['**/*.test.tsx', '**/*.spec.tsx', '**/__tests__/**'],
      rules: {
        'no-restricted-syntax': [
          'error',
          RESTRICTED_SYNTAX.rawHexColor,
          RESTRICTED_SYNTAX.rawFunctionalColor,
          RESTRICTED_SYNTAX.rawJsxText,
        ],
      },
    },

    // Vendored from the react-native-reusables registry — same reasoning as
    // apps/web/src/components/ui.
    {
      files: ['components/ui/**'],
      rules: {
        'no-restricted-syntax': 'off',
        'no-restricted-properties': 'off',
        '@typescript-eslint/no-unnecessary-condition': 'off',
      },
    },

    // Expo config files run in Node and legitimately read process.env.
    {
      files: ['app.config.ts', 'metro.config.js', 'babel.config.js', 'tailwind.config.ts'],
      rules: {
        'no-console': 'off',
        'import-x/no-extraneous-dependencies': 'off',
      },
    },
  );
}
