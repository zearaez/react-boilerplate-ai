import { afterEach, describe, expect, it, vi } from 'vitest';

import { SESSION_STORAGE_KEY, setLogTransports } from '@repo/core';

import { webStorage } from '../storage';

/**
 * The web storage adapter, which is what makes a reload survivable — and the one
 * file in the repo permitted to touch localStorage (see eslint.config.js).
 *
 * The failure modes matter more than the happy path here. Hydration runs before
 * the first paint, so an adapter that throws is a blank screen rather than a
 * degraded session, and localStorage throws on ACCESS in more browsers than
 * people expect: Safari in private mode, site data blocked, quota full.
 */

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  setLogTransports([]);
});

describe('webStorage', () => {
  it('round-trips a value through localStorage', async () => {
    await webStorage.set(SESSION_STORAGE_KEY, '{"hello":"world"}');

    // Really in localStorage, not just in a closure: this is the whole point.
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBe('{"hello":"world"}');
    await expect(webStorage.get(SESSION_STORAGE_KEY)).resolves.toBe('{"hello":"world"}');
  });

  it('reads back null for a key that was never written', async () => {
    await expect(webStorage.get('nope')).resolves.toBeNull();
  });

  it('clears a value on remove', async () => {
    await webStorage.set(SESSION_STORAGE_KEY, 'x');
    await webStorage.remove(SESSION_STORAGE_KEY);

    await expect(webStorage.get(SESSION_STORAGE_KEY)).resolves.toBeNull();
  });

  it('survives a write that throws, instead of failing the sign-in', async () => {
    // Quota exceeded, the realistic case. The session must still work for this
    // page's lifetime — it just will not survive a reload.
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    await expect(webStorage.set(SESSION_STORAGE_KEY, 'x')).resolves.toBeUndefined();
  });

  it('survives a read that throws, and reports no session rather than crashing', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('SecurityError');
    });

    // null, not a rejection: hydrate() treats this as "nobody is signed in",
    // which shows a login screen. A throw would show nothing at all.
    await expect(webStorage.get(SESSION_STORAGE_KEY)).resolves.toBeNull();
  });

  it('survives a remove that throws, so sign-out still completes', async () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('SecurityError');
    });

    await expect(webStorage.remove(SESSION_STORAGE_KEY)).resolves.toBeUndefined();
  });

  it('falls back to memory when localStorage is unusable at load time', async () => {
    // Safari private mode: present, and throws on write. The probe runs at module
    // load, so the module has to be re-imported with the broken global in place.
    vi.resetModules();
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new DOMException('SecurityError');
      },
      setItem: () => {
        throw new DOMException('SecurityError');
      },
      removeItem: () => {
        throw new DOMException('SecurityError');
      },
    });

    const { webStorage: degraded } = await import('../storage');

    // Works, in memory: the app runs, and reload signs the user out — which is
    // exactly the old behaviour rather than a broken one.
    await expect(degraded.set(SESSION_STORAGE_KEY, 'in-memory')).resolves.toBeUndefined();
    await expect(degraded.get(SESSION_STORAGE_KEY)).resolves.toBe('in-memory');

    vi.unstubAllGlobals();
    vi.resetModules();
  });
});
