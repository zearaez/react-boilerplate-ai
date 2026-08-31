import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type RenderHookOptions, renderHook } from '@testing-library/react';

import type { ReactNode } from 'react';

/**
 * The ONE .tsx file in @repo/core, and it is deliberate.
 *
 * Testing a React Query hook requires a QueryClientProvider, which requires
 * JSX. This file never ships to an app — it lives under src/test/ and is
 * excluded from coverage and from the "no JSX in core" lint rule. If you find
 * yourself adding a second .tsx file here, the code belongs in an app.
 */

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      // No retries in tests: a retryable failure would turn an assertion into a
      // multi-second timeout with a confusing message.
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

export interface RenderHookWithQueryResult<TResult, TProps> extends ReturnType<
  typeof renderHook<TResult, TProps>
> {
  queryClient: QueryClient;
}

export function renderHookWithQuery<TResult, TProps>(
  hook: (props: TProps) => TResult,
  options?: Omit<RenderHookOptions<TProps>, 'wrapper'> & { queryClient?: QueryClient },
): RenderHookWithQueryResult<TResult, TProps> {
  const queryClient = options?.queryClient ?? createTestQueryClient();

  const result = renderHook(hook, {
    ...options,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });

  return { ...result, queryClient };
}

export { createTestQueryClient };
