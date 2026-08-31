import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type RenderOptions, render } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';

import { createQueryClient } from '@repo/core';

import type { ReactElement, ReactNode } from 'react';
import type { RouteObject } from 'react-router';

function testQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      // No retries in tests: a retryable failure becomes a multi-second timeout
      // with a confusing message instead of a clear assertion failure.
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

function withQuery(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

/**
 * Renders a component at `/` inside a QueryClient and a memory router.
 *
 * Use this for components. For a page that reads route params, use
 * `renderRoute` — a component calling `useParams()` here would see an empty
 * object and silently render its loading state forever.
 */
export function renderWithProviders(
  ui: ReactElement,
  options: Omit<RenderOptions, 'wrapper'> & { route?: string } = {},
) {
  const { route = '/', ...renderOptions } = options;
  const queryClient = testQueryClient();

  const router = createMemoryRouter(
    [
      { path: '/', element: ui },
      // A catch-all keeps Link targets resolvable so tests stay focused on the
      // component rather than on routing.
      { path: '*', element: null },
    ],
    { initialEntries: [route] },
  );

  return {
    ...render(<RouterProvider router={router} />, {
      ...renderOptions,
      wrapper: withQuery(queryClient),
    }),
    queryClient,
    router,
  };
}

/**
 * Renders a page at a real route so `useParams` works.
 *
 *   renderRoute({ path: '/posts/:id', element: <PostDetailPage />, initialEntry: '/posts/post-001' })
 *
 * `extraRoutes` lets a test assert a navigation landed somewhere, by giving the
 * destination a recognisable element.
 */
export function renderRoute({
  path,
  element,
  initialEntry,
  extraRoutes = [],
  ...renderOptions
}: {
  path: string;
  element: ReactElement;
  initialEntry: string;
  extraRoutes?: RouteObject[];
} & Omit<RenderOptions, 'wrapper'>) {
  const queryClient = testQueryClient();

  const router = createMemoryRouter(
    [{ path, element }, ...extraRoutes, { path: '*', element: null }],
    {
      initialEntries: [initialEntry],
    },
  );

  return {
    ...render(<RouterProvider router={router} />, {
      ...renderOptions,
      wrapper: withQuery(queryClient),
    }),
    queryClient,
    router,
  };
}

/** For a component that needs a QueryClient but no router. */
export function renderWithQuery(ui: ReactElement, options: Omit<RenderOptions, 'wrapper'> = {}) {
  const queryClient = createQueryClient();
  return {
    ...render(ui, { ...options, wrapper: withQuery(queryClient) }),
    queryClient,
  };
}
