import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useAuthStore } from '@repo/core';

import { signInTestUser } from '@/test/auth';
import { renderRoute } from '@/test/render';

import { ProtectedLayout } from '../protected-layout';

/**
 * The bug these tests exist for: `main.tsx` originally never called
 * `hydrate()`, so the store stayed at status 'idle' forever, ProtectedLayout
 * treated that as "still loading", and the app rendered a loading message
 * instead of redirecting to /login. Playwright caught it; these make it cheap to
 * catch again.
 */
function renderGuard() {
  return renderRoute({
    path: '/',
    element: <ProtectedLayout />,
    initialEntry: '/',
    extraRoutes: [{ path: '/login', element: <p>login screen</p> }],
  });
}

beforeEach(() => {
  useAuthStore.setState({ status: 'idle', tokens: null, user: null });
});

describe('ProtectedLayout', () => {
  it('shows a busy state while the session is still being read', () => {
    renderGuard();

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('login screen')).not.toBeInTheDocument();
  });

  it('redirects to /login once hydration finds no session', async () => {
    const { router } = renderGuard();

    // This is what the app entry does. Skipping it is the bug.
    await useAuthStore.getState().hydrate();

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login');
    });
  });

  it('does not redirect an authenticated user', async () => {
    await signInTestUser();
    const { router } = renderGuard();

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
    expect(router.state.location.pathname).toBe('/');
  });

  it('redirects when a 401 clears the session mid-a-session', async () => {
    await signInTestUser();
    const { router } = renderGuard();
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // What the axios interceptor does on a 401 — the guard must react to the store
    // without anything injecting a navigator into @repo/core.
    await useAuthStore.getState().signOut();

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login');
    });
  });
});
