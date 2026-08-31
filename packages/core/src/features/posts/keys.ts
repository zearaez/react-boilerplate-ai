import type { PostListParams } from './schemas';

/**
 * The shape every feature copies.
 *
 * The nesting matters: because `detail(id)` starts with `all`, invalidating
 * `postKeys.all` invalidates every post query, and invalidating
 * `postKeys.lists()` leaves individual details cached. That hierarchy is the
 * entire point of a key factory — you get precise invalidation for free.
 */
export const postKeys = {
  all: ['posts'] as const,
  lists: () => [...postKeys.all, 'list'] as const,
  list: (params: PostListParams) => [...postKeys.lists(), params] as const,
  details: () => [...postKeys.all, 'detail'] as const,
  detail: (id: string) => [...postKeys.details(), id] as const,
};
