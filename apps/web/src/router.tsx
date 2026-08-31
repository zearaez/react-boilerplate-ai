import { createBrowserRouter } from 'react-router';

import { getAuthToken, postsListOptions } from '@repo/core';

import { AppShell } from '@/components/app-shell';
import { ProtectedLayout } from '@/components/protected-layout';
import { RouteError } from '@/components/route-error';
import { LoginPage } from '@/features/auth/login-page';
import { PostsListPage } from '@/features/posts/posts-list-page';
import { queryClient } from '@/lib/query-client';

/**
 * React Router 8, data mode.
 *
 * Two rules that keep web and mobile symmetric — see AGENTS.md:
 *
 * 1. NO route `action`s. Every mutation goes through useMutation, so the
 *    mutation logic lives in @repo/core and is identical on both platforms.
 *    Routes exist to render, not to write.
 *
 * 2. Loaders are for PREFETCH ONLY, they are optional, and they MUST NOT THROW.
 *    The one below warms the cache using the same queryOptions object the
 *    component subscribes to, which is what guarantees the prefetch actually
 *    lands.
 *
 *    Both guards on it are load-bearing, and the first version of this file had
 *    neither — the Playwright demo-flow spec is what caught it:
 *
 *      - React Router runs a matched route's loader REGARDLESS of what its parent
 *        component would render. So on an unauthenticated first visit the loader
 *        fired before <ProtectedLayout> could redirect, got a 401, and threw into
 *        errorElement. The user saw "Something went wrong / Not authenticated."
 *        instead of the login screen.
 *      - A prefetch that can break the page is worse than no prefetch. Failures
 *        are swallowed here and left to the component's own hook, which already
 *        renders a proper error state with a retry.
 *
 *    If you are unsure whether to add a loader: don't.
 *
 * 3. Secondary routes use `lazy`, so each is its own chunk and is only fetched
 *    when visited (audit item 11.4). The login page and the list page are eager
 *    because one of them is always the first thing rendered — lazy-loading those
 *    only adds a round trip.
 *
 * Imports come from `react-router`. `react-router-dom` does not exist at v8 —
 * it is frozen at 7.18.2, and installing it gives you a silently stale router.
 */
export const router = createBrowserRouter([
  {
    path: '/login',
    Component: LoginPage,
    errorElement: <RouteError />,
  },
  // Public, and lazy: nobody arrives here first except from an email link, and
  // the two pages together are dead weight in the login chunk.
  {
    path: '/forgot-password',
    lazy: async () => ({
      Component: (await import('@/features/auth/forgot-password-page')).ForgotPasswordPage,
    }),
    errorElement: <RouteError />,
  },
  {
    path: '/reset-password',
    lazy: async () => ({
      Component: (await import('@/features/auth/reset-password-page')).ResetPasswordPage,
    }),
    errorElement: <RouteError />,
  },
  {
    Component: ProtectedLayout,
    errorElement: <RouteError />,
    children: [
      {
        Component: AppShell,
        children: [
          {
            index: true,
            loader: async () => {
              // Nothing to prefetch without a token, and asking would 401.
              if (!getAuthToken()) return null;
              // Never let a warm-up failure become a page failure.
              await queryClient.ensureInfiniteQueryData(postsListOptions()).catch(() => null);
              return null;
            },
            Component: PostsListPage,
          },
          {
            path: 'posts/new',
            lazy: async () => ({
              Component: (await import('@/features/posts/post-create-page')).PostCreatePage,
            }),
          },
          {
            path: 'posts/:id',
            lazy: async () => ({
              Component: (await import('@/features/posts/post-detail-page')).PostDetailPage,
            }),
          },
          {
            path: 'posts/:id/edit',
            lazy: async () => ({
              Component: (await import('@/features/posts/post-edit-page')).PostEditPage,
            }),
          },
          // `pnpm gen feature` appends new routes below this marker.
          {
            path: 'profile',
            lazy: async () => ({
              Component: (await import('@/features/profile/profile-page')).ProfilePage,
            }),
          },
          // @gen:routes
        ],
      },
    ],
  },
]);
