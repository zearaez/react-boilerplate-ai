import { describe, expect, it } from 'vitest';

import { DEMO_EMAIL, DEMO_PASSWORD } from '@repo/mocks';

import { ApiError } from '../../../api/errors';
import { getRuntime } from '../../../runtime';
import { login } from '../api';
import { SESSION_STORAGE_KEY, getAuthToken, useAuthStore } from '../store';

describe('useAuthStore', () => {
  it('starts idle so the app knows to keep the splash screen up', () => {
    expect(useAuthStore.getState().status).toBe('idle');
  });

  it('hydrates to unauthenticated when nothing is persisted', async () => {
    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(getAuthToken()).toBeNull();
  });

  it('persists a session on signIn and restores it on hydrate', async () => {
    const session = await login({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
    await useAuthStore.getState().signIn(session);

    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(useAuthStore.getState().user?.email).toBe(DEMO_EMAIL);
    expect(getAuthToken()).toBe(session.tokens.accessToken);

    // Simulate a cold start: wipe in-memory state, keep storage.
    useAuthStore.setState({ status: 'idle', tokens: null, user: null });
    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(getAuthToken()).toBe(session.tokens.accessToken);
  });

  it('clears storage on signOut', async () => {
    const session = await login({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
    await useAuthStore.getState().signIn(session);

    await useAuthStore.getState().signOut();

    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(await getRuntime().storage.get(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('discards a persisted session that no longer matches the schema', async () => {
    // This is the upgrade path: v1 of the app persisted a different shape.
    // It must degrade to "logged out", never crash on boot.
    await getRuntime().storage.set(SESSION_STORAGE_KEY, JSON.stringify({ token: 42 }));

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(await getRuntime().storage.get(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('discards persisted data that is not even JSON', async () => {
    await getRuntime().storage.set(SESSION_STORAGE_KEY, 'not json{');

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });
});

describe('login', () => {
  it('rejects a wrong password with a 400, as the real server does', async () => {
    // Verified against the live API: bad credentials are 400, not 401. That is
    // not a detail — a 401 here would make the client's refresh interceptor try
    // to renew a token that was never issued.
    await expect(login({ email: DEMO_EMAIL, password: 'wrong-password' })).rejects.toMatchObject({
      kind: 'validation',
      status: 400,
    });
  });

  it('surfaces the server message rather than a generic one', async () => {
    const error = await login({ email: DEMO_EMAIL, password: 'nope' }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    // Read out of ProblemDetails.detail; the login form renders it as a
    // form-level error.
    expect((error as ApiError).message).toBe('Invalid email or password');
  });

  it('does not sign an existing session out when someone mistypes a password', async () => {
    // The 400 is what protects this: a 401 would hit the interceptor, fail to
    // refresh, and end a perfectly good session because of a typo on a re-auth
    // prompt.
    await useAuthStore
      .getState()
      .signIn(await login({ email: DEMO_EMAIL, password: DEMO_PASSWORD }));

    await expect(login({ email: DEMO_EMAIL, password: 'wrong' })).rejects.toThrow();

    expect(useAuthStore.getState().status).toBe('authenticated');
  });
});
