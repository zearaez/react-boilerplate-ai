import * as Sentry from '@sentry/react';

import {
  configureLogger,
  getConsoleTransport,
  type LogRecord,
  type LogTransport,
  setLogTransports,
} from '@repo/core';

/**
 * Error tracking + log shipping (audit items 10.3, 10.5).
 *
 * Sentry is opt-in by DSN: with VITE_SENTRY_DSN unset, nothing initialises and
 * nothing is sent. That keeps local development and CI silent without needing a
 * separate flag.
 */
export function initObservability(): void {
  // @repo/core never sniffs its environment — it runs on Hermes, in a browser and
  // in Node, and those disagree about every global worth sniffing. The app knows
  // which one it is, so the app tells it. Mobile does the same with __DEV__.
  configureLogger({
    level: import.meta.env.PROD ? 'info' : 'debug',
    format: import.meta.env.PROD ? 'json' : 'pretty',
  });

  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    setLogTransports([getConsoleTransport()]);
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_APP_ENV ?? 'development',
    tracesSampleRate: 0.1,
    // Session Replay is off deliberately: it costs money and it records the
    // DOM, which is a PII surface. Turn it on per-project after a privacy review.
    sendDefaultPii: false,
    beforeSend(event) {
      // Belt and braces — @repo/core's logger already redacts, but a Sentry
      // event can also come from an unhandled throw that never went through it.
      if (event.request?.cookies) delete event.request.cookies;
      return event;
    },
  });

  // Sentry's vocabulary is 'warning', ours is 'warn'. Mapping explicitly beats
  // a cast — a cast here would have compiled and then silently dropped the level.
  const SENTRY_LEVEL: Record<LogRecord['level'], Sentry.SeverityLevel> = {
    debug: 'debug',
    info: 'info',
    warn: 'warning',
    error: 'error',
  };

  const sentryTransport: LogTransport = (record) => {
    if (record.level === 'error') {
      Sentry.captureMessage(record.message, {
        level: 'error',
        extra: record.context ?? {},
      });
      return;
    }
    Sentry.addBreadcrumb({
      level: SENTRY_LEVEL[record.level],
      message: record.message,
      data: record.context ?? {},
    });
  };

  setLogTransports([getConsoleTransport(), sentryTransport]);
}

export { Sentry };
