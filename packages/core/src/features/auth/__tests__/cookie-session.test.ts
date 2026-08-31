import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import { DEMO_EMAIL, DEMO_PASSWORD } from '@repo/mocks';

import { getRuntime } from '../../../runtime';
import { authenticateTestUser } from '../../../test/authenticate';
import { server } from '../../../test/setup';
import { fetchCurrentUser, login, logout } from '../api';
import { bootstrapSession } from '../session';
import { SESSION_STORAGE_KEY, useAuthStore } from '../store';

/**
 * The httpOnly-refresh-cookie contract, from the only side this code can see.
 *
 * A client cannot read an httpOnly cookie, so "the cookie is present" is not
 * something these tests can set up — and does not need to be. What the client
 * observes is a server that accepts a refresh with NO token in the body and
 * answers with a fresh access token and no refresh token. That is exactly what
 * the handler below does, which makes it a faithful stand-in rather than a
 * simplification.
 *
 * See docs/api/auth-cookie-contract.md for the half the backend owns.
 */

/**
 * Turns the mock backend into a cookie-mode one, and returns the session whose
 * real access token it will hand out.
 *
 * The token has to be a REAL one from the mock db, or the follow-up /users/me
 * would 401 and the probe would look broken when it was the fixture that was.
 */
async function useCookieBackend() {
  const session = await login({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
  // Signed in, not merely logged in: the store's `user` has to be populated,
  // because the REQUEST interceptor re-reads the store on a replayed request. A
  // refresh whose tokens never reach the store replays with the dead one.
  await useAuthStore.getState().signIn(session);

  let refreshCalls = 0;
  server.use(
    http.post('*/auth/refresh', () => {
      refreshCalls += 1;
      // No `refresh_token` in the response: that is the whole point of the
      // contract. It went out as a Set-Cookie the browser holds.
      return HttpResponse.json({
        access_token: session.tokens.accessToken,
        access_token_expires_at: session.tokens.accessTokenExpiresAt,
      });
    }),
  );

  return { session, refreshCalls: () => refreshCalls };
}

/** What a browser reload leaves behind on web: nothing in memory, nothing in storage. */
async function simulateReload(): Promise<void> {
  await getRuntime().storage.remove(SESSION_STORAGE_KEY);
  useAuthStore.setState({ status: 'idle', tokens: null, user: null });
}

describe('bootstrapSession', () => {
  it('restores the session from the cookie after a reload', async () => {
    const backend = await useCookieBackend();
    await simulateReload();

    await bootstrapSession();

    // Signed in again with no login screen and no credential in storage — the
    // whole point of the exercise.
    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(useAuthStore.getState().user?.email).toBe(DEMO_EMAIL);
    expect(backend.refreshCalls()).toBe(1);
    // Nothing to persist, and nothing persisted: the credential stayed in the
    // cookie jar, which is the only reason this is safe on web.
    expect(useAuthStore.getState().tokens?.refreshToken).toBeUndefined();
  });

  it('stays signed out when there is no cookie', async () => {
    // No handler override: the real mock refuses a bodyless refresh, exactly as
    // the live server does.
    await bootstrapSession();

    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('prefers a persisted session and never reaches for the network', async () => {
    // Mobile's path. The keychain has a full session, so probing would be a
    // pointless request on every cold start.
    let refreshCalls = 0;
    server.use(
      http.post('*/auth/refresh', () => {
        refreshCalls += 1;
        return new HttpResponse(null, { status: 500 });
      }),
    );

    await authenticateTestUser();
    // Restart the app WITHOUT clearing storage.
    useAuthStore.setState({ status: 'idle', tokens: null, user: null });

    await bootstrapSession();

    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(refreshCalls).toBe(0);
  });

  it('survives a probe that hangs or fails without wedging startup', async () => {
    server.use(http.post('*/auth/refresh', () => HttpResponse.error()));

    // Must resolve, not reject: this runs before the first paint, and a throw
    // here would be a white screen instead of a login form.
    await expect(bootstrapSession()).resolves.toBeUndefined();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });
});

describe('a cookie-mode session mid-flight', () => {
  it('refreshes on a 401 with no refresh token in memory', async () => {
    const backend = await useCookieBackend();

    // The state a restored cookie session is in: an access token, a user, and no
    // refresh token anywhere JavaScript can reach.
    useAuthStore.setState({
      status: 'authenticated',
      tokens: {
        accessToken: 'dead-access-token',
        accessTokenExpiresAt: backend.session.tokens.accessTokenExpiresAt,
        refreshToken: undefined,
        refreshTokenExpiresAt: undefined,
      },
    });

    const fetched = await fetchCurrentUser();

    expect(fetched.email).toBe(DEMO_EMAIL);
    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(backend.refreshCalls()).toBe(1);
  });

  it('trusts a persisted session whose refresh expiry it cannot see', async () => {
    // A cookie's expiry is not readable from JS, so there is no local check to
    // make — the first 401 is what decides. Hydrating as signed-out instead would
    // throw away a perfectly good session.
    await getRuntime().storage.set(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        tokens: { accessToken: 'stored-access-token', accessTokenExpiresAt: 'whenever' },
        user: {
          id: 'user-1',
          name: 'Anisha Shrestha',
          email: DEMO_EMAIL,
          phone: null,
          role: 'admin',
          createdAt: '2026-01-04T09:00:00Z',
        },
      }),
    );

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().status).toBe('authenticated');
  });
});

describe('logout', () => {
  it('tells the server, so an httpOnly cookie can actually be cleared', async () => {
    let logoutCalls = 0;
    server.use(
      http.post('*/auth/logout', () => {
        logoutCalls += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await authenticateTestUser();
    await logout();

    expect(logoutCalls).toBe(1);
  });

  it('resolves even when the endpoint does not exist', async () => {
    // Today's server: /auth/logout is a 404. Sign-out is a local decision and
    // must not fail because the network disagreed.
    server.use(http.post('*/auth/logout', () => new HttpResponse(null, { status: 404 })));

    await expect(logout()).resolves.toBeUndefined();
  });
});
