import { QueryClient } from '@tanstack/react-query';

import { type ApiError, isApiError } from '../api/errors';

/**
 * Tells TanStack Query that every error in this app is an ApiError.
 *
 * Without this, `query.error` is typed `Error` and reading `error.kind` fails to
 * compile at every call site — which pushes people toward casting. One
 * declaration here types every useQuery and useMutation in both apps correctly.
 *
 * It is safe because the api layer guarantees it: every function in a feature's
 * api.ts funnels its failures through toApiError().
 */
declare module '@tanstack/react-query' {
  interface Register {
    defaultError: ApiError;
  }
}

/** 1 minute. Data is considered fresh this long; no refetch inside the window. */
export const DEFAULT_STALE_TIME_MS = 60_000;
/** 5 minutes. How long an unused cache entry survives before collection. */
export const DEFAULT_GC_TIME_MS = 300_000;

const MAX_RETRIES = 2;

/**
 * staleTime and gcTime are set EXPLICITLY, never left to defaults — that is a
 * standing rule in docs/engineering-checklist terms and it matters most on
 * mobile, where TanStack Query's default of "refetch on every focus" turns
 * every app-switch into a burst of requests on a metered connection.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_TIME_MS,
        gcTime: DEFAULT_GC_TIME_MS,
        // Mobile flows do not want a refetch every time the app regains focus.
        // apps/mobile/lib/query-platform.ts wires AppState -> focusManager so
        // the behaviour is at least deliberate on both platforms.
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Never retry a 4xx: the request is wrong, not unlucky. Retrying a
          // 401 in particular races the sign-out in the response interceptor.
          if (isApiError(error) && !error.isRetryable) return false;
          return failureCount < MAX_RETRIES;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8_000),
      },
      mutations: {
        // A retried mutation can double-create. Retrying is opt-in per mutation.
        retry: false,
      },
    },
  });
}
