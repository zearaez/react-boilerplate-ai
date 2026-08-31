import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { getApiClient } from '../../../api/client';
import { createMemoryStorage } from '../../../storage/memory';
import { authenticateTestUser } from '../../../test/authenticate';
import { renderHookWithQuery } from '../../../test/render-hook';
import { fetchCurrentUser, logout } from '../api';
import { useCurrentUser, useLogout, useSession } from '../hooks';
import { authKeys } from '../keys';
import { useAuthStore } from '../store';

describe('authKeys', () => {
  it('nests so the whole namespace can be invalidated at once', () => {
    expect(authKeys.currentUser()).toEqual(['auth', 'me']);
    expect(authKeys.currentUser().slice(0, 1)).toEqual([...authKeys.all]);
  });
});

describe('useSession', () => {
  it('reports loading while the persisted session is still being read', () => {
    const { result } = renderHookWithQuery(() => useSession());

    // status starts 'idle' — the app must keep the splash screen up.
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('reports the signed-in user once hydrated', async () => {
    await authenticateTestUser();
    const { result } = renderHookWithQuery(() => useSession());

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.user?.email).toBe('anisha@example.com');
  });
});

describe('useCurrentUser', () => {
  it('does not fire while unauthenticated', () => {
    const { result } = renderHookWithQuery(() => useCurrentUser());

    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fetches once there is a token to send', async () => {
    await authenticateTestUser();
    const { result } = renderHookWithQuery(() => useCurrentUser());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.email).toBe('anisha@example.com');
  });
});

describe('useLogout', () => {
  beforeEach(async () => {
    await authenticateTestUser();
  });

  it('clears the session and the query cache', async () => {
    const { result, queryClient } = renderHookWithQuery(() => useLogout());
    queryClient.setQueryData(['something'], 'cached');

    await result.current.mutateAsync();

    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(useAuthStore.getState().tokens).toBeNull();
    // Cached data belongs to the previous user and must not survive.
    expect(queryClient.getQueryData(['something'])).toBeUndefined();
  });

  it('signs out locally even when the server call fails', async () => {
    // Someone who pressed "log out" must end up logged out regardless.
    const { result } = renderHookWithQuery(() => useLogout());
    useAuthStore.setState({
      tokens: {
        accessToken: 'a-token-the-server-will-reject',
        accessTokenExpiresAt: '2099-01-01T00:00:00.000Z',
        refreshToken: 'a-refresh-token-the-server-will-reject',
        refreshTokenExpiresAt: '2099-01-01T00:00:00.000Z',
      },
    });

    await result.current.mutateAsync().catch(() => undefined);

    await waitFor(() => {
      expect(useAuthStore.getState().status).toBe('unauthenticated');
    });
  });
});

describe('auth api', () => {
  it('logout resolves against the mock backend', async () => {
    await authenticateTestUser();
    await expect(logout()).resolves.toBeUndefined();
  });

  it('fetchCurrentUser rejects with unauthorized when there is no token', async () => {
    await expect(fetchCurrentUser()).rejects.toMatchObject({ kind: 'unauthorized' });
  });

  it('fetchCurrentUser parses the response against userSchema', async () => {
    await authenticateTestUser();
    const user = await fetchCurrentUser();

    expect(user).toMatchObject({ email: 'anisha@example.com', role: 'admin' });
    // The password must never cross the wire.
    expect(Object.keys(user)).not.toContain('password');
  });
});

describe('createMemoryStorage', () => {
  it('round-trips, removes, reports size and clears', async () => {
    const storage = createMemoryStorage();

    expect(await storage.get('missing')).toBeNull();

    await storage.set('a', '1');
    await storage.set('b', '2');
    expect(storage.size()).toBe(2);
    expect(await storage.get('a')).toBe('1');

    await storage.remove('a');
    expect(await storage.get('a')).toBeNull();
    expect(storage.size()).toBe(1);

    storage.clear();
    expect(storage.size()).toBe(0);
  });
});

describe('the api client', () => {
  it('is created lazily and reused', () => {
    // Lazily, because baseURL comes from CoreRuntime, which is configured at app
    // start rather than at import time.
    expect(getApiClient()).toBe(getApiClient());
  });

  it('points at the configured apiUrl', () => {
    expect(getApiClient().defaults.baseURL).toBe('http://localhost:4000');
  });
});
