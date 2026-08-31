import { baseConfig } from '@repo/config/eslint/base';

export default [
  ...baseConfig({ tsconfigRootDir: import.meta.dirname }),
  {
    /**
     * `src/handlers/index.ts` is a machine-append target: `pnpm gen feature` inserts
     * an import after the `@gen:handler-imports` anchor.
     *
     * `import-x/order` cannot be satisfied there. The anchor has to be a comment,
     * and ESLint's fixer will not move an import across a comment — so an appended
     * import is reported as "fixable" and then never fixed, leaving every generated
     * feature with a lint error the generator cannot avoid.
     *
     * Import order in a five-line barrel is cosmetic, so it is switched off for
     * this one file rather than left as a permanent false positive. Every other
     * rule still applies here, and every other file still enforces order.
     */
    files: ['src/handlers/index.ts'],
    rules: {
      'import-x/order': 'off',
    },
  },
];
