import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { useAuthStore } from '@repo/core';

import { signInTestUser } from '@/test/auth';
import { renderRoute } from '@/test/render';

import { AppShell } from '../app-shell';

/**
 * The shell: sidebar, header, and the drawer that replaces the sidebar on a
 * narrow screen.
 *
 * `path: '*'` so the shell matches every route and therefore SURVIVES a
 * navigation. With a concrete path it would unmount the moment a nav link fired,
 * and the assertions about what the drawer does afterwards would pass for the
 * wrong reason.
 */
function renderShell(initialEntry = '/') {
  return renderRoute({ path: '*', element: <AppShell />, initialEntry });
}

/**
 * jsdom applies no CSS, so `hidden md:block` does not hide anything here and the
 * navigation really is in the document twice while the drawer is open. Scoping by
 * landmark is what keeps a query from matching both — and it is why these use
 * roles rather than a bare getByRole('link').
 */
const sidebar = () => within(screen.getByRole('complementary'));
const drawer = () => within(screen.getByRole('dialog'));

beforeEach(() => {
  useAuthStore.setState({ status: 'idle', tokens: null, user: null });
});

describe('sidebar navigation', () => {
  it('shows every section the signed-in user can reach', async () => {
    await signInTestUser();
    renderShell();

    expect(sidebar().getByRole('link', { name: 'Posts' })).toBeInTheDocument();
    expect(sidebar().getByRole('link', { name: 'Profile' })).toBeInTheDocument();
  });

  it('marks the current section as the current page', async () => {
    await signInTestUser();
    renderShell('/profile');

    expect(sidebar().getByRole('link', { name: 'Profile' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(sidebar().getByRole('link', { name: 'Posts' })).not.toHaveAttribute('aria-current');
  });

  it('keeps Posts current while a nested post route is open', async () => {
    // The reason nav-items.ts carries a predicate instead of relying on NavLink:
    // Posts is the INDEX route, and neither `end` nor its absence gets this right.
    await signInTestUser();
    renderShell('/posts/post-001/edit');

    expect(sidebar().getByRole('link', { name: 'Posts' })).toHaveAttribute('aria-current', 'page');
  });
});

describe('header', () => {
  it('shows who is signed in, and links to their profile', async () => {
    await signInTestUser();
    renderShell();

    const header = within(screen.getByRole('banner'));
    const identity = header.getByRole('link', { name: /Anisha Shrestha/ });

    expect(identity).toHaveAttribute('href', '/profile');
    expect(header.getByText('Administrator')).toBeInTheDocument();
  });

  it('signs the user out', async () => {
    await signInTestUser();
    renderShell();

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => {
      expect(useAuthStore.getState().status).toBe('unauthenticated');
    });
  });
});

describe('the navigation drawer', () => {
  it('opens from the header and carries the same navigation', async () => {
    await signInTestUser();
    renderShell();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));

    // Same items as the sidebar, because both render AppNav.
    expect(drawer().getByRole('link', { name: 'Posts' })).toBeInTheDocument();
    expect(drawer().getByRole('link', { name: 'Profile' })).toBeInTheDocument();
  });

  it('closes when a link inside it is used', async () => {
    await signInTestUser();
    const { router } = renderShell();

    await userEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    await userEvent.click(drawer().getByRole('link', { name: 'Profile' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/profile');
    });
    // A drawer still covering the screen you just navigated to is the bug here.
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('closes on a navigation it did not trigger', async () => {
    // The derived-state guard in AppShell: a redirect or the back button moves the
    // route without the drawer's own link handler ever running.
    await signInTestUser();
    const { router } = renderShell();

    await userEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await router.navigate('/posts/post-001');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
