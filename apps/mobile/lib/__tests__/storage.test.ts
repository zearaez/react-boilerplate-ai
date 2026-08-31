import * as SecureStore from 'expo-secure-store';

import { SESSION_STORAGE_KEY, configureCore, setLogTransports, useAuthStore } from '@repo/core';

import { secureStorage } from '../storage';

import type { Session } from '@repo/core';

/**
 * The adapter that makes mobile the platform where a session actually survives.
 * Web is memory-only by design, so this file is the only place the "stay signed
 * in" promise is testable at all.
 *
 * expo-secure-store is mocked with an in-memory keychain: the native module is
 * not available under jest, and the contract worth asserting is ours (delegation,
 * the size guard, and a session that round-trips) rather than Apple's.
 */
jest.mock('expo-secure-store', () => {
  const keychain = new Map<string, string>();
  return {
    getItemAsync: jest.fn((key: string) => Promise.resolve(keychain.get(key) ?? null)),
    setItemAsync: jest.fn((key: string, value: string) => {
      keychain.set(key, value);
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn((key: string) => {
      keychain.delete(key);
      return Promise.resolve();
    }),
    __keychain: keychain,
  };
});

const keychain = (SecureStore as unknown as { __keychain: Map<string, string> }).__keychain;

/**
 * Shaped like the real thing: this is a session captured from the live
 * API (639-char JWT, opaque refresh token), with the values
 * scrubbed. Size matters here — see the cap test below.
 */
function makeSession(overrides: { refreshTokenExpiresAt?: string } = {}): Session {
  const hour = 3_600_000;
  return {
    tokens: {
      accessToken: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${'x'.repeat(560)}.sig`,
      accessTokenExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      refreshToken: 'cmTAoNuB7sQ3X8+acRlgySDg2arYvQv+j2o8wd1BsxU=',
      refreshTokenExpiresAt:
        overrides.refreshTokenExpiresAt ?? new Date(Date.now() + 30 * 24 * hour).toISOString(),
    },
    user: {
      id: '01a01f8e-ccea-75e9-993b-7d3f6f1fc845',
      name: 'Demo Admin',
      email: 'admin@example.test',
      phone: null,
      role: 'admin',
      createdAt: '2026-08-20T14:24:07.027Z',
    },
  };
}

beforeEach(() => {
  // The unreadable-session case logs a warning by design; keep it out of the
  // test output while leaving the logger callable so that path still runs.
  setLogTransports([]);
  keychain.clear();
  jest.clearAllMocks();
  configureCore({ apiUrl: 'http://localhost:4000', storage: secureStorage });
  useAuthStore.setState({ status: 'idle', tokens: null, user: null });
});

describe('secureStorage', () => {
  it('reads, writes and deletes through the keychain', async () => {
    await secureStorage.set('k', 'v');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('k', 'v');
    await expect(secureStorage.get('k')).resolves.toBe('v');

    await secureStorage.remove('k');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('k');
    await expect(secureStorage.get('k')).resolves.toBeNull();
  });

  it('returns null for a key that was never written', async () => {
    await expect(secureStorage.get('nope')).resolves.toBeNull();
  });

  it('refuses an oversized value instead of letting iOS fail opaquely', async () => {
    await expect(secureStorage.set(SESSION_STORAGE_KEY, 'x'.repeat(2001))).rejects.toThrow(
      /iOS caps items at 2048 bytes/,
    );
    // And nothing was written: a half-write would leave a session that hydrates
    // into garbage on next launch.
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('accepts a real-sized session, with room to spare', async () => {
    // The regression guard that matters: adding a field to the user schema is
    // what would silently push a session past the cap, and the failure would
    // surface as "login does not persist" on iOS only.
    const serialised = JSON.stringify(makeSession());
    expect(serialised.length).toBeLessThan(1500);

    await expect(secureStorage.set(SESSION_STORAGE_KEY, serialised)).resolves.toBeUndefined();
  });
});

describe('a session across an app restart', () => {
  it('signs the user back in from the keychain, with no login screen', async () => {
    const session = makeSession();
    await useAuthStore.getState().signIn(session);
    expect(keychain.get(SESSION_STORAGE_KEY)).toBeDefined();

    // The app is killed and relaunched: the store is back to 'idle', the
    // keychain is not.
    useAuthStore.setState({ status: 'idle', tokens: null, user: null });
    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(useAuthStore.getState().user?.email).toBe('admin@example.test');
    expect(useAuthStore.getState().tokens?.refreshToken).toBe(session.tokens.refreshToken);
  });

  it('asks for a login only once the refresh token has expired', async () => {
    // The other half of the requirement. An expired refresh token cannot be
    // exchanged, so hydrating as 'authenticated' would render the app and then
    // 401 on the first request.
    await useAuthStore
      .getState()
      .signIn(makeSession({ refreshTokenExpiresAt: new Date(Date.now() - 1000).toISOString() }));

    useAuthStore.setState({ status: 'idle', tokens: null, user: null });
    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().status).toBe('unauthenticated');
    // The dead session is cleared, not left to be re-read on every launch.
    expect(keychain.has(SESSION_STORAGE_KEY)).toBe(false);
  });

  it('discards a keychain entry it cannot parse rather than crashing on launch', async () => {
    keychain.set(SESSION_STORAGE_KEY, '{"tokens":{"accessToken":"only-half-a-session"}}');

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(keychain.has(SESSION_STORAGE_KEY)).toBe(false);
  });
});
