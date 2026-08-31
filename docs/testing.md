# Testing

```bash
pnpm test              # Vitest: @repo/core, @repo/tokens, apps/web
pnpm test:coverage     # with thresholds — what CI gates on
pnpm test:mobile       # jest-expo
pnpm test:e2e          # Playwright, against the production build with mocks
pnpm test:e2e:dev      # Playwright, against `vite dev` — boot smoke test only
```

## Two runners, on purpose

| Scope                                    | Runner                  | Why                                                              |
| ---------------------------------------- | ----------------------- | ---------------------------------------------------------------- |
| `@repo/core`, `@repo/tokens`, `apps/web` | **Vitest 4**            | Fast, shares the Vite transform pipeline                         |
| `apps/mobile`                            | **jest-expo + Jest 29** | Metro's resolver and RN's Flow-typed source need the Expo preset |

Jest is pinned to **29** because `jest-expo@57` depends on Jest 29 internals; a v30
runtime fails at suite start. See [versions.md](versions.md).

## What is tested where

**`@repo/core` carries the real bar** (80% statements/functions/lines, 70% branches)
because it holds all the logic: the error mapper, the retry predicate, the auth
store's hydration and its handling of corrupt persisted data, the optimistic
rollback, and the pagination boundary.

Notable cases worth keeping:

- **`mock-contract.test.ts`** parses the mock backend's _actual responses_ against
  core's zod schemas. `@repo/mocks` imports nothing from `@repo/core`, so this is
  what replaces a type-level link — and it is stronger, because it catches a handler
  and a schema drifting apart.
- **Pagination** uses 48 fixtures at `pageSize: 10`, giving a short final page. An
  exact multiple would hide off-by-one errors in `hasMore`.
- **The rollback test** targets `post-fail`, whose PATCH always 500s.

**`apps/web`** has component tests plus an **axe** accessibility check. Note that
axe's `color-contrast` rule is explicitly disabled there: jsdom has no canvas, so
the rule would be silently _skipped_ rather than passing. Contrast is covered
properly by the token-level WCAG test in `@repo/tokens`.

**`apps/mobile`** tests rendering. There is no MSW: `msw/native` needs
`MessageEvent`, `EventTarget` and `BroadcastChannel`, none of which exist on Hermes,
and its own docs call the integration "potentially incomplete". All HTTP-level
behaviour is covered in `@repo/core` under `msw/node`.

## Two traps

**Vitest 4 changed `coverage.include`** to default to only files loaded during the
run — so untested files become invisible and any threshold passes trivially. It is
set explicitly in `vitest.config.ts`. If you ever see coverage jump suspiciously,
check that line first.

**RNTL 14 made `render` async.** `await render(...)`. An un-awaited render is a
floating promise that lint catches; silencing it lets assertions race the mount.

## Thresholds

Global floor 65/65/65/50, `@repo/core` at 80/80/80/70. The global floor is low
because the untested surface is deliberate — the web feature pages are covered by
two component tests and an axe check rather than exhaustively.

The floor is set just under what the shipped tests actually achieve. A template that
fails its own gate on first clone gets its thresholds deleted in week one, and a
threshold of 0 is worse than none because it looks like a gate. Raise them as you
add real screens.

## E2E

`apps/web/e2e/demo-flow.spec.ts`, five specs, ~5 seconds. It builds the app and runs
`vite preview` with `VITE_ENABLE_MOCKS=true`, so it needs no backend and behaves the
same locally and in CI.

It is deliberately **one long journey** plus a few focused specs, rather than a spec
per screen — the value is "can a user get from sign-in to a deleted post", and
splitting that would just re-run sign-in six times.

Two of its assertions exist to catch things no unit test can:

- **that Tailwind survived the build** — it reads the computed
  `background-color` of a button and the `--primary` custom property from the live
  page. Tailwind purging and Rolldown tree-shaking have both broken styling in
  `build` while `dev` looked fine.
- **that the optimistic update rolls back** — it edits `post-fail`, sees the error,
  goes back, and asserts the ORIGINAL title is shown.

**On its first run it found two real bugs** that all unit tests missed:
`main.tsx` never called `hydrate()` (so the app hung on a loading state instead of
redirecting to login), and the index route's prefetch loader ran before the auth
guard could redirect, 401'd, and threw into the error boundary. That is the argument
for having it.

**Two rules when writing E2E here**, both learned the hard way:

1. **Never `page.goto()` once signed in.** Web tokens are memory-only by design, so
   a full page load signs the user out — a `goto` mid-journey silently tests the
   login screen instead. Navigate by clicking.
2. **Assert on roles and labels**, not CSS classes. That is also how the missing
   `<h1>` on the login screen was found: shadcn's `CardTitle` renders a `<div>`.

## The dev-server smoke test

`apps/web/e2e-dev/dev-server.spec.ts`, three specs, ~3 seconds, run by
`pnpm test:e2e:dev` through a second config (`playwright.dev.config.ts`, port 5174).

It exists because of a gap in the shape of everything above: `vite build` for the
bundle assertions, `vite preview` for the journey specs, Node for Vitest. Every gate
in the repo pointed at the production build, so **`vite dev` — the environment
developers use all day — was the one surface with no check on it**. A dev-only
failure (a stale optimize cache, a dep that only misbehaves unbundled, a serve-mode
plugin) could ship with CI fully green.

It is deliberately shallow; the journey is covered in `e2e/`. It asks only:

1. the app boots with **no uncaught errors and no `console.error`** — reaching the
   login screen proves the whole import graph evaluated;
2. **`typeof process === 'undefined'`** — nothing Node-only leaked into the browser;
3. **logger output reaches the console**, asserted against the real
   `[debug] Web app booted` line that `main.tsx` emits — so one spec covers
   `configureLogger()`, the console transport and the pretty format.

Keep it a separate config rather than a second project in `playwright.config.ts`:
the production suite stays fast, and this one stays runnable on its own.

## Not shipped

Mobile E2E. Maestro is the choice when a project needs it; emulator-based mobile E2E
in CI is a maintenance sink at this size. The mobile app is covered by jest-expo
rendering tests, `expo export` in CI, and the native-bundle style assertion.
