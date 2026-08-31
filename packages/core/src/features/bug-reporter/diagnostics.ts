import {
  type LastFailedApiCall,
  type LogCaptureHandle,
  installLogCapture,
} from '@outcode/bug-reporter-core';

/**
 * What a bug report carries beyond what the user typed.
 *
 * Two independent sources, because neither one sees the other's failures:
 *
 *   1. `installLogCapture()` — a rolling buffer of console warnings/errors. The
 *      repo's `logger` writes through the console transport, so every
 *      logger.warn/error already lands here for free.
 *   2. `recordFailedRequest()` — the last failed HTTP call, pushed in by the
 *      axios response interceptor in src/api/client.ts.
 *
 * Why (2) exists at all: the library can wrap global `fetch` itself
 * (`captureFetch`), but this repo talks to its API through axios, and axios uses
 * XMLHttpRequest in both browsers and Hermes. A fetch wrapper would therefore
 * record nothing an axios call ever did — so it is switched OFF below and the
 * interceptor feeds this module directly instead. Turning `captureFetch` back on
 * would not add coverage; it would only add a global patch that fires on MSW's
 * own traffic.
 */

let capture: LogCaptureHandle | null = null;
let lastFailedRequest: LastFailedApiCall | undefined;

/**
 * Patch the console once, near app start. Idempotent: React StrictMode
 * double-invokes effects and both apps call this at module scope, so a second
 * call must not stack a second set of patches (which would double every
 * breadcrumb and make `uninstall()` unable to restore the original console).
 */
export function installBugReporterDiagnostics(): void {
  if (capture !== null) return;

  capture = installLogCapture({
    levels: ['warn', 'error'],
    max: 25,
    // See the note above: axios never touches fetch, so this would capture
    // nothing we care about.
    captureFetch: false,
  });
}

/**
 * Record a failed request. Called from the axios response interceptor, so it has
 * to be cheap and must never throw — a diagnostics failure must not turn a
 * recoverable API error into an unhandled one.
 */
export function recordFailedRequest(entry: Omit<LastFailedApiCall, 'timestamp'>): void {
  lastFailedRequest = { ...entry, timestamp: new Date().toISOString() };
}

/**
 * Wired into `BugReporterConfig.collectDiagnostics`, which the library calls at
 * SUBMIT time rather than when the form opens — so a report that sat in the
 * offline queue is described by the state it is actually sent in.
 */
export function collectBugReporterDiagnostics(): Record<string, unknown> {
  return {
    ...capture?.collect(),
    ...(lastFailedRequest ? { lastFailedApiCall: lastFailedRequest } : {}),
  };
}

/** Test-only. Drops the console patches and the recorded request. */
export function resetBugReporterDiagnostics(): void {
  capture?.uninstall();
  capture = null;
  lastFailedRequest = undefined;
}
