import globals from 'globals';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

import { baseConfig, RESTRICTED_SYNTAX } from './base.js';

/**
 * For apps/web: Vite + React Router + Tailwind 3 + shadcn/ui.
 *
 * @param {object} options
 * @param {string} options.tsconfigRootDir
 */
export function reactWebConfig({ tsconfigRootDir }) {
  return tseslint.config(
    ...baseConfig({ tsconfigRootDir }),

    {
      files: ['**/*.{ts,tsx}'],
      languageOptions: {
        globals: { ...globals.browser },
      },
      // react-hooks 7 ships the React Compiler rules (purity, refs,
      // immutability, preserve-manual-memoization, …). eslint-plugin-react-compiler
      // is dead — never install it.
      extends: [reactHooks.configs.flat.recommended, jsxA11y.flatConfigs.recommended],
      plugins: { 'react-refresh': reactRefresh },
      rules: {
        'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: 'react-router-dom',
                message:
                  'react-router-dom does not exist at v8 (it is frozen at 7.18.2). Import from `react-router`, and DOM-only APIs from `react-router/dom`.',
              },
              {
                name: 'react-native',
                message:
                  'This is the web app. There is no react-native-web in this repo — shared UI was deliberately not adopted (see docs/versions.md).',
              },
            ],
          },
        ],
      },
    },

    // User-facing strings live in feature screens, so that is where the i18n
    // rule bites. Vendored shadcn primitives are exempt.
    //
    // Tests must be excluded EXPLICITLY. baseConfig turns no-restricted-syntax off
    // for test files, but this block matches later and would turn it back on — and
    // test fixtures legitimately contain literal JSX (route stubs, sample markup).
    {
      files: ['src/features/**/*.tsx', 'src/components/*.tsx'],
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

    // Vendored from the shadcn registry. We own the files but do not restyle
    // them, so holding them to our authored-code rules is pure friction.
    {
      files: ['src/components/ui/**'],
      rules: {
        'no-restricted-syntax': 'off',
        'jsx-a11y/heading-has-content': 'off',
        'react-refresh/only-export-components': 'off',
        '@typescript-eslint/no-unnecessary-condition': 'off',
      },
    },
  );
}
