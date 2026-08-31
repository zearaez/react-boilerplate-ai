import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { useUiStore } from '@/stores/ui-store';
import { signInTestUser } from '@/test/auth';
import { renderWithProviders } from '@/test/render';

import { PostsListPage } from '../posts-list-page';

/**
 * REFERENCE TEST: the search pattern.
 *
 * Real timers on purpose. userEvent with fake timers needs an `advanceTimers`
 * bridge and the resulting test reads nothing like the behaviour it describes;
 * waiting for a 300ms debounce is cheap. The debounce mechanics themselves are
 * unit-tested in @repo/core (use-debounced-value.test.ts) — this covers the wiring.
 */
beforeEach(async () => {
  await signInTestUser();
});

async function waitForList() {
  await waitFor(() => {
    expect(screen.getByRole('list')).toBeInTheDocument();
  });
}

describe('posts search', () => {
  it('filters the list to matching posts', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PostsListPage />);
    await waitForList();

    await user.type(screen.getByLabelText('Search'), 'always fails');

    await waitFor(() => {
      expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(1);
    });
    expect(screen.getByText(/always fails/i)).toBeInTheDocument();
  });

  it('keeps typing instant — the input shows every keystroke immediately', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PostsListPage />);
    await waitForList();

    const input = screen.getByLabelText<HTMLInputElement>('Search');
    await user.type(input, 'boring');

    // Bound to the raw value, not the debounced one. Binding it to the debounced
    // value is the mistake this asserts against — the field would lag by 300ms.
    expect(input.value).toBe('boring');
  });

  it('distinguishes "no results" from "no posts at all"', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PostsListPage />);
    await waitForList();

    await user.type(screen.getByLabelText('Search'), 'zzzzz-nothing-matches');

    // Not "No posts yet. Create the first one." — that would be wrong and would
    // read as careless.
    expect(await screen.findByText(/Nothing matched/i)).toBeInTheDocument();
    expect(screen.queryByText(/No posts yet/i)).not.toBeInTheDocument();
  });

  it('does not blank the list while a new term loads', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PostsListPage />);
    await waitForList();

    await user.type(screen.getByLabelText('Search'), 'boring');

    // keepPreviousData: a list stays on screen throughout rather than the whole
    // region unmounting into a skeleton on each new term.
    expect(screen.getByRole('list')).toBeInTheDocument();
    await waitFor(() => {
      expect(within(screen.getByRole('list')).getAllByRole('listitem').length).toBeGreaterThan(0);
    });
  });

  it('persists the term in app-local state so it survives navigation', async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithProviders(<PostsListPage />);
    await waitForList();

    await user.type(screen.getByLabelText('Search'), 'boring');
    expect(useUiStore.getState().postsSearch).toBe('boring');

    // Navigating away and back must not lose the filter — which is the entire
    // reason this lives in a store rather than useState.
    unmount();
    renderWithProviders(<PostsListPage />);

    expect(screen.getByLabelText<HTMLInputElement>('Search').value).toBe('boring');
  });
});
