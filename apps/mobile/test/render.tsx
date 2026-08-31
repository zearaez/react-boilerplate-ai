import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { ReactElement, ReactNode } from 'react';

/**
 * Renders a screen inside the providers every screen needs.
 *
 * Counterpart: apps/web/src/test/render.tsx.
 *
 * `SafeAreaProvider` is not optional — `components/screen.tsx` calls
 * `useSafeAreaInsets()`, which throws "No safe area value available" without it.
 * `initialMetrics` is supplied because the real provider measures asynchronously on
 * a native view that does not exist in a test, so without it insets never resolve
 * and every screen hangs on its first render.
 *
 * NOTE: `render` from RNTL 14 is ASYNC. Always `await renderScreen(...)`.
 */
const TEST_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function testQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

export async function renderScreen(ui: ReactElement, options: { queryClient?: QueryClient } = {}) {
  const queryClient = options.queryClient ?? testQueryClient();

  const result = await render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <SafeAreaProvider initialMetrics={TEST_METRICS}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </SafeAreaProvider>
    ),
  });

  return { ...result, queryClient };
}
