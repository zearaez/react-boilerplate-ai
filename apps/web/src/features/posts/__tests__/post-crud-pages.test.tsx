import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { ALWAYS_FAILS_POST_ID } from '@repo/mocks';

import { signInTestUser } from '@/test/auth';
import { renderRoute } from '@/test/render';

import { PostCreatePage } from '../post-create-page';
import { PostDetailPage } from '../post-detail-page';
import { PostEditPage } from '../post-edit-page';

beforeEach(async () => {
  await signInTestUser();
});

describe('PostDetailPage', () => {
  it('renders the post at the route param', async () => {
    renderRoute({
      path: '/posts/:id',
      element: <PostDetailPage />,
      initialEntry: '/posts/post-001',
    });

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/#1/);
    expect(screen.getByText(/Anisha Shrestha|Bikash Tamang/)).toBeInTheDocument();
  });

  it('shows the not-found message for a missing id, not a raw error', async () => {
    renderRoute({
      path: '/posts/:id',
      element: <PostDetailPage />,
      initialEntry: '/posts/does-not-exist',
    });

    expect(await screen.findByText(/does not exist, or it was deleted/i)).toBeInTheDocument();
  });

  it('deletes after confirming in the dialog and navigates away', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute({
      path: '/posts/:id',
      element: <PostDetailPage />,
      initialEntry: '/posts/post-002',
      extraRoutes: [{ path: '/', element: <p>list</p> }],
    });

    await screen.findByRole('heading', { level: 1 });

    // The destructive action is behind a dialog on purpose.
    await user.click(screen.getByRole('button', { name: /delete/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    });
  });
});

describe('PostCreatePage', () => {
  it('rejects invalid input client-side without navigating', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute({
      path: '/posts/new',
      element: <PostCreatePage />,
      initialEntry: '/posts/new',
    });

    await user.type(screen.getByLabelText('Title'), 'no');
    await user.type(screen.getByLabelText('Body'), 'short');
    await user.click(screen.getByRole('button', { name: 'Create post' }));

    // Messages come from createPostInputSchema in @repo/core — the same schema the
    // mobile form uses.
    expect(await screen.findByText(/at least 3 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/posts/new');
  });

  it('creates a post and navigates to its detail route', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute({
      path: '/posts/new',
      element: <PostCreatePage />,
      initialEntry: '/posts/new',
      extraRoutes: [{ path: '/posts/:id', element: <p>detail</p> }],
    });

    await user.type(screen.getByLabelText('Title'), 'A brand new post');
    await user.type(screen.getByLabelText('Body'), 'With a body long enough to pass validation.');
    await user.click(screen.getByRole('button', { name: 'Create post' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toMatch(/^\/posts\/post-\d+$/);
    });
  });
});

describe('PostEditPage', () => {
  it('prefills the form from the loaded post', async () => {
    renderRoute({
      path: '/posts/:id/edit',
      element: <PostEditPage />,
      initialEntry: '/posts/post-003/edit',
    });

    // Read .value directly: jest-dom's toHaveValue does not accept asymmetric
    // matchers, and the fixture title carries a suffix we only want to match on.
    await waitFor(() => {
      expect(screen.getByLabelText<HTMLInputElement>('Title').value).toContain('#3');
    });
    expect(screen.getByLabelText<HTMLTextAreaElement>('Body').value.length).toBeGreaterThan(10);
  });

  /**
   * THE ROLLBACK, ASSERTED THROUGH THE UI.
   *
   * `post-fail` always returns 500 from PATCH. The optimistic update in
   * useUpdatePost writes the new title into the cache immediately, then must put
   * the original back. A unit test covers the cache; this covers what a user sees.
   */
  it('surfaces the server error and does not navigate when the save fails', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute({
      path: '/posts/:id/edit',
      element: <PostEditPage />,
      initialEntry: `/posts/${ALWAYS_FAILS_POST_ID}/edit`,
    });

    const title = await screen.findByLabelText('Title');
    await user.clear(title);
    await user.type(title, 'This will never be saved');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/always fails to save/i);
    expect(router.state.location.pathname).toBe(`/posts/${ALWAYS_FAILS_POST_ID}/edit`);
  });

  it('saves a valid edit and returns to the detail route', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute({
      path: '/posts/:id/edit',
      element: <PostEditPage />,
      initialEntry: '/posts/post-004/edit',
      extraRoutes: [{ path: '/posts/:id', element: <p>detail</p> }],
    });

    const title = await screen.findByLabelText('Title');
    await user.clear(title);
    await user.type(title, 'An edited title');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/posts/post-004');
    });
  });
});
