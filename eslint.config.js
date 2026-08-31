import { baseConfig } from '@repo/config/eslint/base';

/**
 * Root config — covers repo-level files only (scripts/, turbo/generators/).
 *
 * ESLint 10 resolves config from each linted file's directory upward, so every
 * package's own eslint.config.js is picked up automatically. This file is NOT
 * a fallback for packages that lack one.
 */
export default [
  {
    ignores: ['apps/**', 'packages/**'],
  },
  ...baseConfig({ tsconfigRootDir: import.meta.dirname }),
];
