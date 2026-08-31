import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { TOTAL_SEEDED_POSTS } from '@repo/mocks';

import { signInTestUser } from '@/test/auth';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/setup';

import { PostsListPage } from '../posts-list-page';

const TOTAL = TOTAL_SEEDED_POSTS + 1; // 47 generated + the seeded always-fails one

beforeEach(async () => {
  await signInTestUser();
});

describe('PostsListPage', () => {
  it('shows a loading skeleton before data arrives', () => {
    renderWithProviders(<PostsListPage />);

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });

  it('renders the first page and the total count', async () => {
    renderWithProviders(<PostsListPage />);

    await waitFor(() => {
      expect(screen.getByRole('list')).toBeInTheDocument();
    });

    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(10);
    expect(screen.getByText(`${String(TOTAL)} posts`)).toBeInTheDocument();
  });

  it('appends the next page without duplicating items', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PostsListPage />);

    await waitFor(() => {
      expect(screen.getByRole('list')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Load more' }));

    await waitFor(() => {
      expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(20);
    });

    const titles = screen.getAllByRole('link').map((link) => link.textContent);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('hides the load-more button once every page is loaded', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PostsListPage />);
    await waitFor(() => {
      expect(screen.getByRole('list')).toBeInTheDocument();
    });

    // 48 items at pageSize 10 is 5 pages, so 4 more clicks.
    for (let i = 0; i < 4; i += 1) {
      await user.click(screen.getByRole('button', { name: 'Load more' }));
      await waitFor(() => {
        expect(within(screen.getByRole('list')).getAllByRole('listitem').length).toBeGreaterThan(
          10 * (i + 1),
        );
      });
    }

    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('shows an empty state rather than a bare list', async () => {
    server.use(
      // The `PagedListOf<T>` wire shape: snake_case, no hasMore. Must match what
      // packages/mocks sends, or this stub tests a contract nothing else uses.
      http.get('*/api/posts', () =>
        HttpResponse.json({ items: [], page: 1, page_size: 10, total_count: 0 }),
      ),
    );

    renderWithProviders(<PostsListPage />);

    expect(await screen.findByText(/No posts yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('shows a retry affordance on failure, and recovers when the retry succeeds', async () => {
    const user = userEvent.setup();
    let attempts = 0;
    server.use(
      http.get('*/api/posts', () => {
        attempts += 1;
        if (attempts === 1) return HttpResponse.json({ message: 'boom' }, { status: 500 });
        return HttpResponse.json({
          items: [
            {
              id: 'post-x',
              title: 'Recovered post',
              body: 'Body long enough to render.',
              authorId: 'user-1',
              authorName: 'Anisha Shrestha',
              published: true,
              createdAt: '2026-01-01T09:00:00.000Z',
            },
          ],
          page: 1,
          page_size: 10,
          total_count: 1,
        });
      }),
    );

    renderWithProviders(<PostsListPage />);

    const alert = await screen.findByRole('alert');
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Recovered post')).toBeInTheDocument();
  });

  it('renders the offline message for a network failure, not the raw error', async () => {
    server.use(http.get('*/api/posts', () => HttpResponse.error()));

    renderWithProviders(<PostsListPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not reach the server/i);
  });
});
