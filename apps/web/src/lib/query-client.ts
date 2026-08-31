import { createQueryClient } from '@repo/core';

/**
 * One QueryClient for the app.
 *
 * It lives at module scope (not inside a component) because React Router
 * loaders need to call `queryClient.ensureInfiniteQueryData(...)` outside the
 * React tree. Creating it in a component would give loaders a different cache
 * than the components read from — a prefetch that silently never hits.
 */
export const queryClient = createQueryClient();
