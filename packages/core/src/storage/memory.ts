import type { CoreStorage } from '../runtime';

export interface MemoryStorage extends CoreStorage {
  clear: () => void;
  size: () => number;
}

/**
 * CoreStorage backed by a Map.
 *
 * This is NOT test-only scaffolding — apps/web uses it in production. On web the
 * access token is deliberately memory-only (audit item 19.3): a token in
 * localStorage is readable by any XSS payload, and this template has no backend
 * to issue an httpOnly refresh cookie.
 *
 * The cost is that a full page reload signs the user out. That is the correct
 * trade for a template; see docs/security-and-privacy.md for how to add
 * refresh-cookie persistence once a real backend exists.
 */
export function createMemoryStorage(): MemoryStorage {
  const store = new Map<string, string>();

  return {
    get: (key) => Promise.resolve(store.get(key) ?? null),
    set: (key, value) => {
      store.set(key, value);
      return Promise.resolve();
    },
    remove: (key) => {
      store.delete(key);
      return Promise.resolve();
    },
    clear: () => store.clear(),
    size: () => store.size,
  };
}
