# Observability

## Logging

`logger` from `@repo/core` is the only way to emit a log line. `no-console: error`
makes it the only path, which is what allows the guarantees below to hold.

```ts
import { logger } from '@repo/core';
logger.info('Session restored', { userId: user.id });
logger.error('Checkout failed', { orderId, error: String(error) });
```

Four levels (`debug`/`info`/`warn`/`error`). Structured JSON in production, readable
text in development.

### The app chooses the level and format, not `@repo/core`

`@repo/core` never detects its own environment. It runs on Hermes, in a browser and
in Node under Vitest, and there is no global those three agree on — `process` does
not exist in two of them. So each app tells core what it is, once, at startup:

```ts
// apps/web/src/lib/observability.ts
configureLogger({
  level: import.meta.env.PROD ? 'info' : 'debug',
  format: import.meta.env.PROD ? 'json' : 'pretty',
});

// apps/mobile/app/_layout.tsx
configureLogger({ level: __DEV__ ? 'debug' : 'info', format: __DEV__ ? 'pretty' : 'json' });
```

The defaults if nobody calls it are `debug` + `pretty` — the development-friendly
pair, on purpose. A forgotten call should produce too many logs, never silence.

`process` is in the `no-restricted-globals` list for `@repo/core` so this cannot be
undone by accident.

### "Why can't I see anything in the console?"

Almost always because nothing logged, not because logging is broken. The web app has
exactly three `logger` call sites and all three are on error paths (route error
boundary, 401 sign-out, unreadable persisted session), so a healthy session is meant
to be quiet. `main.tsx` logs one `debug` line on boot — `[debug] Web app booted` —
purely so the transport is visibly alive; if you see that, logging works.

Two other things worth knowing:

- `no-console: error` means `console.log` is a lint failure repo-wide. Use `logger`.
- `logger.debug` deliberately calls `console.log`, not `console.debug`, because
  Chrome hides `console.debug` behind the **Verbose** level filter — which produces
  exactly this symptom.

`pnpm test:e2e:dev` asserts the boot line reaches a real browser console.

### PII redaction is automatic

Every context object is walked before it reaches a transport, and any key matching a
PII name — `password`, `token`, `email`, `phone`, `address`, `ssn`, card fields, and
others, case- and separator-insensitive — is replaced with `[redacted]`. The walk is
depth-limited and cycle-safe, because axios error objects are cyclic and they are
exactly what gets logged on failure.

Redaction covers _keys_, not values. `logger.info(user.email)` as a **message** is
not redacted, because the message is a format string, not data. Put data in the
context object.

A throwing transport can never break the caller.

## Error tracking

Sentry, opt-in by DSN: with `VITE_SENTRY_DSN` / `EXPO_PUBLIC_SENTRY_DSN` unset,
nothing initialises and nothing is sent. That keeps local development and CI silent
without a separate flag.

`apps/web/src/lib/observability.ts` wires it up and registers a second log transport,
so `logger.error` becomes a Sentry event and lower levels become breadcrumbs. Note the
explicit level map — Sentry says `warning` where we say `warn`, and a cast there would
have compiled and silently dropped the level.

`tracesSampleRate` is 0.1. `sendDefaultPii` is **false**, and cookies are stripped in
`beforeSend` as a second line of defence, because an unhandled throw reaches Sentry
without passing through our logger.

**Session Replay is off.** It costs money and records the DOM, which is a PII surface.
Turn it on per project after a privacy review.

Sourcemaps are uploaded by `deploy-web.yml` — without them a production stack trace is
minified noise, which makes the error tracking a checkbox rather than a tool.

## Health check

`GET /health` on the web deployment returns `apps/web/public/health.json`. A 200 proves
the CDN is serving the deployed build. It says nothing about the API — that has its own
health endpoint in the backend repo.

## What is not shipped

**Centralised log shipping.** Sentry captures errors and breadcrumbs; there is no
Datadog/CloudWatch/ELK pipeline for the full log stream. For two frontend clients with
no server, the marginal value is low — but it is an honest gap, tracked as task 3 in
[audit-clickup-tasks.md](audit-clickup-tasks.md), and the auditor has previously
graded Sentry-alone as insufficient for that item.

**Performance monitoring beyond Sentry traces.** Lighthouse runs nightly; there is no
RUM.

**Alerting.** Configure Sentry alert rules per project — they are not in code.
