import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getProfile, updateProfile } from './api';
import { profileKeys } from './keys';
import { type Profile, type UpdateProfileInput } from './schemas';

import type { ApiError } from '../../api/errors';

export function profileOptions() {
  return queryOptions({
    queryKey: profileKeys.current(),
    queryFn: getProfile,
    // A profile changes rarely and is read on several screens; a longer staleTime
    // avoids refetching it on every navigation.
    staleTime: 300_000,
  });
}

export function useProfileQuery() {
  return useQuery(profileOptions());
}

/**
 * REFERENCE: optimistic update on a SINGLE resource.
 *
 * Simpler than the list case in useUpdatePost, and worth having both:
 *   - there is one cache entry, so no invalidation of sibling lists
 *   - the server response replaces the guess wholesale
 *   - `onSettled` still invalidates, because a PATCH can return computed fields
 *     the client did not predict
 *
 * The cancelQueries call matters here for the same reason it does for posts: an
 * in-flight GET that resolves after the optimistic write would silently revert it.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation<Profile, ApiError, UpdateProfileInput, { previous: Profile | undefined }>({
    mutationFn: updateProfile,

    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: profileKeys.current() });

      const previous = queryClient.getQueryData<Profile>(profileKeys.current());
      if (previous) {
        queryClient.setQueryData<Profile>(profileKeys.current(), { ...previous, ...input });
      }
      return { previous };
    },

    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(profileKeys.current(), context.previous);
      }
    },

    onSuccess: (updated) => {
      queryClient.setQueryData(profileKeys.current(), updated);
    },

    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: profileKeys.current() });
    },
  });
}
