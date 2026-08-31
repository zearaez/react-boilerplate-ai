import {
  infiniteQueryOptions,
  keepPreviousData,
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { flattenPages, nextPageParam } from '../../api/pagination';

import { createPost, deletePost, getPost, listPosts, updatePost } from './api';
import { postKeys } from './keys';
import {
  type CreatePostInput,
  type Post,
  type PostListParamsInput,
  type UpdatePostInput,
  postListParamsSchema,
} from './schemas';

import type { ApiError } from '../../api/errors';

/**
 * queryOptions objects are exported separately from the hooks so a React Router
 * loader can prefetch with `queryClient.ensureInfiniteQueryData(...)` using the
 * exact same key and fn as the component. Sharing the object is what guarantees
 * the prefetch actually hits the cache the component reads.
 */
export function postsListOptions(params: PostListParamsInput = {}) {
  const parsed = postListParamsSchema.parse(params);

  return infiniteQueryOptions({
    queryKey: postKeys.list(parsed),
    queryFn: ({ pageParam }) => listPosts({ ...parsed, page: pageParam }),
    initialPageParam: parsed.page,
    getNextPageParam: nextPageParam,
    /**
     * THE SEARCH PATTERN, half one.
     *
     * `search` is part of the query key, so every distinct term is its own cache
     * entry — which is correct, but means each new term starts with no data and
     * the list would unmount into a skeleton on every keystroke-batch. Users read
     * that as flickering.
     *
     * `keepPreviousData` keeps the last successful result on screen while the new
     * one loads, and flags it via `isPlaceholderData` so the UI can dim instead of
     * blanking. The other half is debouncing the input — see useDebouncedValue.
     */
    placeholderData: keepPreviousData,
  });
}

export function postDetailOptions(id: string) {
  return queryOptions({
    queryKey: postKeys.detail(id),
    queryFn: () => getPost(id),
  });
}

/**
 * The list hook. useInfiniteQuery is the ONLY list hook in this repo: web
 * renders a "Load more" button, native uses FlatList onEndReached. A second
 * page-based hook over the same data would be the first thing to drift.
 */
export function usePostsQuery(params: PostListParamsInput = {}) {
  const query = useInfiniteQuery(postsListOptions(params));
  const parsed = postListParamsSchema.parse(params);

  return {
    ...query,
    /** Flattened for rendering — every screen wants this, not data.pages. */
    posts: flattenPages(query.data?.pages),
    total: query.data?.pages.at(-1)?.total ?? 0,
    /**
     * Distinguishes "this collection is empty" from "your search matched nothing".
     * They need different copy — telling someone to "create the first post" when
     * they mistyped a search term is the kind of small wrongness that makes an app
     * feel careless. Derived here so both platforms cannot disagree about it.
     */
    isSearching: parsed.search !== undefined && parsed.search.length > 0,
  };
}

export function usePostQuery(id: string | undefined) {
  return useQuery({
    ...postDetailOptions(id ?? ''),
    // Never fire without an id — this is the canonical `enabled` example.
    enabled: id !== undefined && id !== '',
    // Detail views tolerate slightly staler data than lists.
    staleTime: 120_000,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation<Post, ApiError, CreatePostInput>({
    mutationFn: createPost,
    onSuccess: async (created) => {
      // Seed the detail cache so navigating straight to the new post is instant.
      queryClient.setQueryData(postKeys.detail(created.id), created);
      // Lists now have an extra item and possibly different pagination, so they
      // are refetched rather than patched.
      await queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}

interface UpdatePostVariables {
  id: string;
  data: UpdatePostInput;
}

/**
 * THE OPTIMISTIC UPDATE PATTERN. Copy this shape for any mutation where the new
 * value is known locally before the server confirms it.
 *
 * The four callbacks are not optional decoration:
 *   onMutate  - cancel in-flight refetches, snapshot, apply the guess
 *   onError   - roll the snapshot back
 *   onSuccess - accept the server's authoritative version
 *   onSettled - invalidate, so anything derived is recomputed
 *
 * Skipping cancelQueries is the classic bug: an in-flight GET resolves after
 * your optimistic write and silently reverts the UI.
 */
export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation<Post, ApiError, UpdatePostVariables, { previous: Post | undefined }>({
    mutationFn: ({ id, data }) => updatePost(id, data),

    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: postKeys.detail(id) });

      const previous = queryClient.getQueryData<Post>(postKeys.detail(id));
      if (previous) {
        queryClient.setQueryData<Post>(postKeys.detail(id), { ...previous, ...data });
      }
      return { previous };
    },

    onError: (_error, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(postKeys.detail(id), context.previous);
      }
    },

    onSuccess: (updated) => {
      queryClient.setQueryData(postKeys.detail(updated.id), updated);
    },

    onSettled: async (_data, _error, { id }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: postKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: postKeys.lists() }),
      ]);
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: deletePost,
    onSuccess: async (_data, id) => {
      queryClient.removeQueries({ queryKey: postKeys.detail(id) });
      await queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}
