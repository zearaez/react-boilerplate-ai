import { configureCore } from '@repo/core';

import { webStorage } from './lib/storage';

/**
 * Configures @repo/core for the web platform.
 *
 * MUST be the first import in src/main.tsx. Any module that calls getRuntime()
 * before this has run throws with a message pointing back here.
 */
const apiUrl = import.meta.env.VITE_API_URL;
const mocksEnabled = import.meta.env.VITE_ENABLE_MOCKS === 'true';

/**
 * Fail loudly rather than silently talking to the dev server.
 *
 * With mocks OFF and no VITE_API_URL, the old fallback below resolved to
 * `window.location.origin` — http://localhost:5173 — so every request went to
 * Vite, which serves index.html for unknown paths. That is a 200 with an HTML
 * body, so it looks like the API answered and then failed zod parsing, and the
 * error says "the API returned data this app does not understand". Hours get
 * spent on the backend before anyone suspects the .env.
 */
if (!apiUrl && !mocksEnabled) {
  throw new Error(
    'VITE_API_URL is not set and VITE_ENABLE_MOCKS is not "true".\n' +
      'Set one of them in the repo-root .env:\n' +
      '  VITE_API_URL=https://api.example.com     # talk to the real API\n' +
      '  VITE_ENABLE_MOCKS=true                   # or run with no backend at all\n' +
      'Note the file must be at the MONOREPO ROOT — apps/web/vite.config.ts points\n' +
      'envDir there. See docs/env-vars.md.',
  );
}

configureCore({
  // The origin fallback is only correct WITH mocks on: MSW intercepts at the
  // network layer, so the origin just has to be a valid absolute URL — the
  // handlers match on `*/auth/...`. With mocks off, the guard above has already
  // stopped us getting here.
  apiUrl: apiUrl || window.location.origin,
  storage: webStorage,
});
