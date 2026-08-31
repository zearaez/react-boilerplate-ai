import { type CoreStorage, createMemoryStorage, logger } from '@repo/core';

/**
 * Web storage adapter, backed by `localStorage`.
 *
 * ## The tradeoff, stated plainly
 *
 * This file used to be memory-only, and the reason was good: anything an XSS
 * payload can read is not a place for a bearer token (audit item 19.3). The cost
 * was that a hard reload signed the user out, because nothing survived it.
 *
 * Persisting the session buys reload survival and pays for it with exposure — a
 * script injected into this origin can read the refresh token, which is the
 * thirty-day credential. There is no client-side arrangement that avoids this:
 * any store JavaScript can read, an attacker's JavaScript can read too, and any
 * store it cannot read cannot survive a reload either.
 *
 * The mechanism that gets both is an httpOnly cookie, which the API does not set
 * yet. `docs/api/auth-cookie-contract.md` specifies it; the client already
 * supports it, and when it ships this file goes back to `createMemoryStorage()`
 * and the lint exception in `eslint.config.js` disappears with it.
 *
 * Until then the mitigations that matter are the ones that keep script injection
 * out: a strict CSP, no `dangerouslySetInnerHTML`, and every user-facing string
 * rendered as text. Those are what this decision now leans on.
 *
 * ## Why the try/catch on every call
 *
 * `localStorage` is not always there, and it does not fail politely. Safari in
 * private mode, a browser configured to block site data, and a full quota all
 * throw on ACCESS, not on a feature check — so `'localStorage' in window` is not
 * enough. A throw here would surface as a blank screen at startup, because
 * hydration runs before the first paint. Falling back to memory degrades to the
 * old behaviour (signed out on reload) instead of breaking the app.
 */

/** Where the fallback lives when localStorage is unusable. */
const fallback = createMemoryStorage();

/**
 * Probes for a genuinely usable localStorage by writing to it.
 *
 * A read-only probe is not sufficient: a browser at quota lets you read and
 * throws on write, which is exactly the case that would otherwise be discovered
 * at sign-in time.
 */
function isLocalStorageUsable(): boolean {
  try {
    const probeKey = '__repo_storage_probe__';
    localStorage.setItem(probeKey, '1');
    localStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

const usable = isLocalStorageUsable();

if (!usable) {
  logger.warn('localStorage is unavailable; the session will not survive a reload');
}

export const webStorage: CoreStorage = {
  get: (key) => {
    if (!usable) return fallback.get(key);
    try {
      return Promise.resolve(localStorage.getItem(key));
    } catch (error) {
      logger.warn('Could not read persisted state', { error: String(error) });
      return Promise.resolve(null);
    }
  },

  set: async (key, value) => {
    if (!usable) return fallback.set(key, value);
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      // Quota, most likely. The session still works for this page's lifetime —
      // it just will not survive a reload — so this must not throw into signIn().
      logger.warn('Could not persist state', { error: String(error) });
    }
  },

  remove: async (key) => {
    if (!usable) return fallback.remove(key);
    try {
      localStorage.removeItem(key);
    } catch (error) {
      // A sign-out that cannot clear storage is the one failure here worth
      // shouting about: the credential outlives the session.
      logger.error('Could not clear persisted state', { error: String(error) });
    }
  },
};
