// MUST be first: configures @repo/core before any module can call getRuntime().
import './app-runtime';
import './global.css';

import { StrictMode } from 'react';

import { createRoot } from 'react-dom/client';

import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router/dom';

import { bootstrapSession, initI18n, installBugReporterDiagnostics, logger } from '@repo/core';

import { BugReporter } from '@/components/bug-reporter';
import { initObservability } from '@/lib/observability';
import { queryClient } from '@/lib/query-client';
import { startMocks } from '@/mocks/browser';
import { router } from '@/router';

// Language detection is the APP's job — @repo/core must not import a browser or
// Expo API. Native does the same thing with expo-localization.
initI18n(navigator.language);
initObservability();

// Starts the rolling console-breadcrumb buffer that every bug report carries.
// Called here, before anything renders, so a warning logged during startup is
// still in the buffer when someone files a report about it.
installBugReporterDiagnostics();

// The reporter ships enabled. Set VITE_BUG_REPORTER_ENABLED=false to leave it out
// of a build entirely — the import is static, so this gates mounting, not bundle
// size. Reports go to this app's own API (see ApiBugReporterRepository), so there
// is no third-party key in the bundle and no reason to disable it by default.
const bugReporterEnabled = import.meta.env.VITE_BUG_REPORTER_ENABLED !== 'false';

function rootContainer(): HTMLElement {
  // Resolved inside a function, not at module scope: narrowing a module-level
  // `const` does not carry into the async closure below, so `container` would
  // still be `HTMLElement | null` at the createRoot call.
  const container = document.getElementById('root');
  if (!container) throw new Error('#root is missing from index.html');
  return container;
}

/**
 * Order matters, and both steps are required:
 *
 *  1. Mocks first, so the very first query is already intercepted.
 *  2. THEN hydrate the session. The auth store starts at status 'idle', and
 *     <ProtectedLayout> treats 'idle' as "still loading" — so without this call
 *     the app renders its loading state forever and never redirects to /login.
 *     Mobile does the same thing in app/_layout.tsx. This was missing on web and
 *     the Playwright demo-flow spec is what caught it; a unit test could not,
 *     because tests sign in directly.
 */
async function bootstrap(): Promise<void> {
  await startMocks();
  // bootstrapSession, not hydrate(): web storage is memory-only, so a cold start
  // has nothing to read and the httpOnly refresh cookie is the only thing that
  // can still prove a session. Awaited before createRoot so nothing renders
  // until the answer is in — otherwise a returning user sees /login flash first.
  await bootstrapSession();

  // The one log line on the happy path, and it is here on purpose.
  //
  // `no-console: error` means `logger` from @repo/core is the only way to print
  // anything, and every other call site in the app is on an error path — so a
  // healthy session used to produce no application output at all, which reads as
  // "logging is broken" rather than "nothing went wrong". This line proves the
  // transport is live and shows the two settings that explain most local
  // confusion. It costs nothing in production: `debug` is below the `info`
  // threshold configureLogger() sets there, so it is never emitted.
  logger.debug('Web app booted', {
    env: import.meta.env.VITE_APP_ENV ?? 'development',
    mocks: import.meta.env.VITE_ENABLE_MOCKS === 'true',
    apiUrl: import.meta.env.VITE_API_URL,
  });

  createRoot(rootContainer()).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        {/*
          Outside the router, not inside a route: the reporter must be reachable
          from every screen, including /login and an error boundary. It reads the
          current path from window.location, so it needs no router context.
        */}
        {bugReporterEnabled ? <BugReporter /> : null}
      </QueryClientProvider>
    </StrictMode>,
  );
}

void bootstrap();
