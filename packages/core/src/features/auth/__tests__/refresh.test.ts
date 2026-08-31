import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import { DEMO_EMAIL, rotateRefreshToken } from '@repo/mocks';

import { getRuntime } from '../../../runtime';
import { authenticateTestUser } from '../../../test/authenticate';
import { server } from '../../../test/setup';
import { fetchCurrentUser } from '../api';
import { SESSION_STORAGE_KEY, useAuthStore } from '../store';

/**
 * The 401 -> refresh -> retry path in api/client.ts.
 *
 * Exercised through real requests rather than by calling the interceptor
 * directly: the whole value of this code is that it runs inside axios, and a test
 * that stubbed that out would pass with the interceptor unregistered.
 */

/** Break the access token, leave the refresh token good — the state a 401 means. */
function expireAccessToken(): void {
  const tokens = useAuthStore.getState().tokens;
  if (!tokens) throw new Error('sign in first');
  useAuthStore.setState({ tokens: { ...tokens, accessToken: 'dead-access-token' } });
}

/** Replaces the refresh route with a counting version that still really rotates. */
function countRefreshCalls(): { count: () => number } {
  let calls = 0;

  server.use(
    http.post('*/auth/refresh', async ({ request }) => {
      calls += 1;
      const body = (await request.json()) as { refresh_token?: unknown };
      const rotated = rotateRefreshToken(
        typeof body.refresh_token === 'string' ? body.refresh_token : '',
      );

      if (!rotated) {
        // 400, matching the live server's response to a spent refresh token.
        return HttpResponse.json(
          { title: 'Bad Request', status: 400, detail: 'Invalid or expired refresh token' },
          { status: 400 },
        );
      }
      return HttpResponse.json(rotated);
    }),
  );

  return { count: () => calls };
}

describe('401 refresh', () => {
  it('refreshes and replays the request, so the user never sees the failure', async () => {
    await authenticateTestUser();
    expireAccessToken();

    const user = await fetchCurrentUser();

    expect(user.email).toBe(DEMO_EMAIL);
    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(useAuthStore.getState().tokens?.accessToken).not.toBe('dead-access-token');
  });

  it('refreshes ONCE for concurrent 401s', async () => {
    // The reason refreshOnce() exists. The API rotates refresh tokens, so
    // three parallel refreshes would spend the token three times: the first wins
    // and the other two present a revoked token, fail, and sign out a session
    // that was perfectly healthy. This is that bug, in test form.
    const refresh = countRefreshCalls();

    await authenticateTestUser();
    expireAccessToken();

    const users = await Promise.all([fetchCurrentUser(), fetchCurrentUser(), fetchCurrentUser()]);

    expect(refresh.count()).toBe(1);
    expect(users.map((user) => user.email)).toEqual([DEMO_EMAIL, DEMO_EMAIL, DEMO_EMAIL]);
    expect(useAuthStore.getState().status).toBe('authenticated');
  });

  it('signs out when the refresh token is dead too', async () => {
    await authenticateTestUser();
    const tokens = useAuthStore.getState().tokens;
    useAuthStore.setState({
      tokens: { ...tokens!, accessToken: 'dead-access-token', refreshToken: 'dead-refresh-token' },
    });

    await expect(fetchCurrentUser()).rejects.toMatchObject({ kind: 'unauthorized' });

    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(await getRuntime().storage.get(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('does not try to refresh a failed refresh', async () => {
    // Guarding on REFRESH_PATH is what stops the interceptor recursing into
    // itself: a 401 from /auth/refresh must end the session, not trigger another
    // refresh.
    const refresh = countRefreshCalls();

    await authenticateTestUser();
    useAuthStore.setState({
      tokens: { ...useAuthStore.getState().tokens!, accessToken: 'dead', refreshToken: 'dead' },
    });

    await expect(fetchCurrentUser()).rejects.toMatchObject({ kind: 'unauthorized' });

    // Exactly one attempt, not a cascade.
    expect(refresh.count()).toBe(1);
  });

  it('gives up after one retry rather than looping', async () => {
    // A server that 401s even with a fresh token must not spin forever.
    await authenticateTestUser();

    server.use(http.get('*/users/me', () => new HttpResponse(null, { status: 401 })));
    countRefreshCalls();
    expireAccessToken();

    await expect(fetchCurrentUser()).rejects.toMatchObject({ kind: 'unauthorized' });
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  /**
   * The other half of "signs out when the refresh token is dead too", and the
   * half that is easy to miss: a refresh that never COMPLETED says nothing about
   * whether the token is still good. The refresh window is thirty days, so a user
   * spends nearly all of it one dropped connection away from an attempt — and a
   * sign-out there loses a session the server would still have honoured.
   */
  it('keeps the session when the refresh endpoint cannot be reached', async () => {
    await authenticateTestUser();
    server.use(http.post('*/auth/refresh', () => HttpResponse.error()));
    expireAccessToken();

    await expect(fetchCurrentUser()).rejects.toMatchObject({ kind: 'unauthorized' });

    // Still signed in, and still persisted — so a reload or a retry resumes.
    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(await getRuntime().storage.get(SESSION_STORAGE_KEY)).not.toBeNull();
  });

  it('keeps the session when the refresh endpoint 500s', async () => {
    await authenticateTestUser();
    server.use(http.post('*/auth/refresh', () => new HttpResponse(null, { status: 500 })));
    expireAccessToken();

    await expect(fetchCurrentUser()).rejects.toMatchObject({ kind: 'unauthorized' });

    expect(useAuthStore.getState().status).toBe('authenticated');
  });

  it('recovers on the next request once the refresh endpoint comes back', async () => {
    // The point of keeping the session: no user action required. The refresh is
    // single-flight, so this also proves the failed attempt cleared
    // refreshInFlight instead of caching its own failure forever.
    await authenticateTestUser();
    server.use(http.post('*/auth/refresh', () => HttpResponse.error()));
    expireAccessToken();

    await expect(fetchCurrentUser()).rejects.toMatchObject({ kind: 'unauthorized' });
    expect(useAuthStore.getState().status).toBe('authenticated');

    // Network is back: the real rotating handler answers again.
    countRefreshCalls();

    const user = await fetchCurrentUser();

    expect(user.email).toBe(DEMO_EMAIL);
    expect(useAuthStore.getState().status).toBe('authenticated');
  });

  it('still signs out on the 400 the live server sends for a spent token', async () => {
    // Guards the classification itself: the API answers a dead refresh
    // token with 400, not 401, so a fix for the transient case must not start
    // treating a genuine refusal as "maybe try later" and strand the user in a
    // session that can never make a request.
    await authenticateTestUser();
    server.use(
      http.post('*/auth/refresh', () =>
        HttpResponse.json(
          { title: 'Bad Request', status: 400, detail: 'Invalid or expired refresh token' },
          { status: 400 },
        ),
      ),
    );
    expireAccessToken();

    await expect(fetchCurrentUser()).rejects.toMatchObject({ kind: 'unauthorized' });

    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(await getRuntime().storage.get(SESSION_STORAGE_KEY)).toBeNull();
  });
});

describe('hydrate', () => {
  it('refuses a persisted session whose refresh token already expired', async () => {
    // Nothing can renew it, so starting 'authenticated' would render the app and
    // then 401 on the first request.
    await getRuntime().storage.set(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        tokens: {
          accessToken: 'a',
          accessTokenExpiresAt: '2020-01-01T00:00:00.000Z',
          refreshToken: 'r',
          refreshTokenExpiresAt: '2020-01-02T00:00:00.000Z',
        },
        user: {
          id: 'user-1',
          name: 'Anisha Shrestha',
          email: DEMO_EMAIL,
          phone: null,
          role: 'admin',
          createdAt: '2026-01-04T09:00:00.000Z',
        },
      }),
    );

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(await getRuntime().storage.get(SESSION_STORAGE_KEY)).toBeNull();
  });
});
