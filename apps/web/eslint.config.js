import { reactWebConfig } from '@repo/config/eslint/react-web';

export default [
  ...reactWebConfig({ tsconfigRootDir: import.meta.dirname }),

  /**
   * The ONE file in this repo allowed to touch `localStorage`.
   *
   * The repo-wide ban stays exactly as it was everywhere else — that rule is what
   * stops "just this once" from becoming the norm, and this override is narrowed
   * to a single path so any new call site still fails the lint.
   *
   * The decision it encodes is deliberate and was taken with the tradeoff on the
   * table: persisting the session is what makes a web reload survivable, and the
   * alternative that keeps the credential out of JavaScript's reach — an httpOnly
   * refresh cookie — needs an API change that does not exist yet. A persisted
   * refresh token IS readable by an XSS payload. See docs/security-and-privacy.md
   * and docs/api/auth-cookie-contract.md for what removes this exception again.
   */
  {
    // The adapter, and the test that asserts on what it actually wrote. The test
    // is listed rather than reaching for `window.localStorage` to slip past the
    // rule — the bare global is what the rule matches, so that dodge would work
    // and would leave the exception undeclared.
    files: ['src/lib/storage.ts', 'src/lib/__tests__/storage.test.ts'],
    rules: {
      'no-restricted-globals': 'off',
    },
  },
];
