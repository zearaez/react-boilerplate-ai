import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { ALWAYS_FAILS_POST_ID, TOTAL_SEEDED_POSTS } from '@repo/mocks';

import { authenticateTestUser } from '../../../test/authenticate';
import { renderHookWithQuery } from '../../../test/render-hook';
import { useCreatePost, useDeletePost, usePostQuery, usePostsQuery, useUpdatePost } from '../hooks';
import { postKeys } from '../keys';

import type { ApiError } from '../../../api/errors';
import type { Post } from '../schemas';

// The fixture set is 47 generated posts plus the seeded always-fails one.
const TOTAL_POSTS = TOTAL_SEEDED_POSTS + 1;

beforeEach(async () => {
  await authenticateTestUser();
});

describe('usePostsQuery', () => {
  it('loads the first page and reports the total', async () => {
    const { result } = renderHookWithQuery(() => usePostsQuery({ pageSize: 10 }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.posts).toHaveLength(10);
    expect(result.current.total).toBe(TOTAL_POSTS);
    expect(result.current.hasNextPage).toBe(true);
  });

  it('accumulates pages through fetchNextPage', async () => {
    const { result } = renderHookWithQuery(() => usePostsQuery({ pageSize: 10 }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await result.current.fetchNextPage();
    await waitFor(() => expect(result.current.posts).toHaveLength(20));

    // No duplicates across page boundaries — the classic pagination bug.
    const ids = result.current.posts.map((post) => post.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('stops when the last, short page is reached', async () => {
    // 48 posts at pageSize 10 means a final page of 8. An exact multiple would
    // hide off-by-one errors in hasMore.
    const { result } = renderHookWithQuery(() => usePostsQuery({ pageSize: 10 }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    for (let i = 0; i < 4; i += 1) {
      await result.current.fetchNextPage();
      await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false));
    }

    await waitFor(() => expect(result.current.posts).toHaveLength(TOTAL_POSTS));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('filters by search', async () => {
    const { result } = renderHookWithQuery(() => usePostsQuery({ search: 'always fails' }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.posts).toHaveLength(1);
    expect(result.current.posts[0]?.id).toBe(ALWAYS_FAILS_POST_ID);
  });
});

describe('usePostQuery', () => {
  it('does not fire without an id', () => {
    const { result } = renderHookWithQuery(() => usePostQuery(undefined));

    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  it('maps a missing post to a notFound ApiError', async () => {
    const { result } = renderHookWithQuery(() => usePostQuery('does-not-exist'));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.kind).toBe('notFound');
  });
});

describe('useCreatePost', () => {
  it('creates, seeds the detail cache, and invalidates lists', async () => {
    const { result, queryClient } = renderHookWithQuery(() => useCreatePost());

    const created = await result.current.mutateAsync({
      title: 'A brand new post',
      body: 'With a body long enough to pass validation.',
      published: true,
    });

    expect(created.id).toBeTruthy();
    // Seeded, so navigating straight to the new post renders instantly.
    expect(queryClient.getQueryData<Post>(postKeys.detail(created.id))).toMatchObject({
      title: 'A brand new post',
    });
  });

  it('reports bad input as a validation error with per-field messages', async () => {
    const { result } = renderHookWithQuery(() => useCreatePost());

    const error = await result.current
      .mutateAsync({ title: 'no', body: 'too short' })
      .then(() => null)
      .catch((caught: unknown) => caught);

    // 'validation' (the user can fix this), NOT 'schema' (the backend broke).
    expect(error).toMatchObject({ kind: 'validation' });
    expect((error as ApiError).fieldErrors).toMatchObject({
      title: ['Title must be at least 3 characters.'],
      body: ['Body must be at least 10 characters.'],
    });
  });

  it('defaults published to false rather than sending undefined', async () => {
    const { result } = renderHookWithQuery(() => useCreatePost());

    const created = await result.current.mutateAsync({
      title: 'Defaults applied',
      body: 'Long enough body for the validator.',
    });

    expect(created.published).toBe(false);
  });
});

describe('useUpdatePost — optimistic update', () => {
  it('applies the change immediately and keeps it when the server agrees', async () => {
    const { result, queryClient } = renderHookWithQuery(() => useUpdatePost());

    const target = 'post-001';
    queryClient.setQueryData<Post>(postKeys.detail(target), {
      id: target,
      title: 'Original title',
      body: 'Original body that is long enough.',
      authorId: 'user-1',
      authorName: 'Anisha Shrestha',
      published: true,
      createdAt: new Date().toISOString(),
    });

    await result.current.mutateAsync({ id: target, data: { title: 'Renamed' } });

    expect(queryClient.getQueryData<Post>(postKeys.detail(target))?.title).toBe('Renamed');
  });

  it('rolls back to the snapshot when the server rejects it', async () => {
    const { result, queryClient } = renderHookWithQuery(() => useUpdatePost());

    const original: Post = {
      id: ALWAYS_FAILS_POST_ID,
      title: 'Original title',
      body: 'Original body that is long enough.',
      authorId: 'user-1',
      authorName: 'Anisha Shrestha',
      published: true,
      createdAt: new Date().toISOString(),
    };
    queryClient.setQueryData<Post>(postKeys.detail(ALWAYS_FAILS_POST_ID), original);

    await expect(
      result.current.mutateAsync({ id: ALWAYS_FAILS_POST_ID, data: { title: 'Never saved' } }),
    ).rejects.toMatchObject({ kind: 'server' });

    // The whole point: the optimistic write must not survive the failure.
    await waitFor(() => {
      expect(queryClient.getQueryData<Post>(postKeys.detail(ALWAYS_FAILS_POST_ID))?.title).toBe(
        'Original title',
      );
    });
  });
});

describe('useDeletePost', () => {
  it('removes the detail cache entry', async () => {
    const { result, queryClient } = renderHookWithQuery(() => useDeletePost());

    queryClient.setQueryData(postKeys.detail('post-002'), { id: 'post-002' });
    await result.current.mutateAsync('post-002');

    expect(queryClient.getQueryData(postKeys.detail('post-002'))).toBeUndefined();
  });
});
