# Changelog

All notable changes to this project are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Add your entry under `## [Unreleased]` in the same PR as the change — the PR
template asks for it. `release.yml` generates GitHub release notes from
Conventional Commits; this file is the human-curated summary, which is not the
same thing.

## [Unreleased]

### Added

- **Three more reference patterns**, chosen to be structurally unlike `posts` so
  agents have a canonical answer for the next-most-common shapes:
  - **Search / filter** on the posts list, both platforms: `useDebouncedValue` in
    `@repo/core`, `placeholderData: keepPreviousData` in `postsListOptions`, and an
    `isSearching` flag so "no results" and "no posts yet" are different messages.
  - **`profile`** — a single-resource form: no list, no route param, populated from a
    query via `reset()`, optimistic update on one cache entry, and cross-field
    validation with `superRefine` so errors attach to the field the user must fix.
    Includes a conditional field whose predicate (`isPhoneRelevant`) lives in core so
    both platforms show and hide it identically.
  - **`apps/*/stores/ui-store.ts`** — app-local Zustand, demonstrating the boundary
    with `@repo/core` that was previously documented but never exemplified.
- `apps/mobile/test/render.tsx`, a mobile render helper wrapping `SafeAreaProvider`
  (with `initialMetrics`, or insets never resolve in a test) and `QueryClientProvider`.
- Four more E2E specs covering search and the profile form.
- 30 more tests (129 → 159), and `docs/patterns.md` §9-11 documenting all three.

- Playwright E2E (`apps/web/e2e/demo-flow.spec.ts`): five specs driving the
  production bundle with mocks — guard redirect, bad credentials, a full
  sign-in → paginate → create → edit → delete → sign-out journey, an assertion that
  Tailwind survived the build, and the optimistic rollback. Runs in CI as the `e2e`
  job.
- Behavioural tests for every web feature page and the route guard. Coverage is now
  83.1% statements / 85.3% functions; thresholds raised to 76/68/78/75.
- `pnpm gen feature` now scaffolds the **full** slice: detail/create/edit pages and a
  form on both platforms, the matching routes and mobile header options, and its own
  tests — so generating a feature raises coverage rather than lowering it.
- `pnpm fix` (eslint --fix + prettier --write), because they are separate steps here.
- `registerReset()` in `@repo/mocks` so generated features reset between tests.

- **A dev-server smoke test** — `pnpm test:e2e:dev`, three specs in
  `apps/web/e2e-dev/` behind their own Playwright config, run in CI after the main
  E2E job. Every other gate pointed at the production build (`vite build`,
  `vite preview`, Node), so `vite dev` was the one environment with no check on it
  and a dev-only breakage could ship with CI green.
- **`configureLogger({ level, format })`** in `@repo/core`, called from
  `apps/web/src/lib/observability.ts` (`import.meta.env.PROD`) and
  `apps/mobile/app/_layout.tsx` (`__DEV__`). Core no longer reads `process.env` —
  see Changed.
- **One `debug` line on a successful web boot** (`[debug] Web app booted`). Every
  other `logger` call site on web is on an error path, so a healthy session produced
  no output at all, which reads as "logging is broken". `test:e2e:dev` asserts it.

### Changed

- **`@repo/core` no longer reads `process.env`,** and `process` is now in the
  package's `no-restricted-globals` list. The old read worked — Vite's `define`
  replaces `process.env.NODE_ENV` in dev, including the bracket form — but core also
  runs on Hermes and under Vitest, and it should not need any one bundler's `define`
  behaviour to be correct. Environment detection is the app's job, as it already was
  for i18n language detection.

### Verified

- The iOS app was built and run on a simulator (Xcode 26.6, iPhone 17): NativeWind
  classes render, design tokens resolve through `hsl(var(--…))` on Hermes,
  SecureStore session persistence and `hydrate()` work, and the shared `@repo/core`
  query path fetches from the mock API over the auto-derived LAN URL. Previously
  only the presence of NativeWind's runtime in the bundle had been asserted.

### Fixed

- **The web app never called `hydrate()`**, so it hung on a loading state instead of
  redirecting unauthenticated visitors to /login. Found by the E2E suite.
- **The index route's prefetch loader threw on a 401** before the auth guard could
  redirect, showing an error boundary to new visitors. Loaders now return early
  without a token and never throw.
- The login screen had **no `<h1>`** — shadcn's `CardTitle` renders a `<div>`. The
  web a11y test now includes axe's `best-practice` tag, which is where the
  missing-heading rule lives.
- Plural translations used the legacy `_plural` suffix; i18next 26 uses `_other`, so
  the post count rendered "48 post".
- Two HIGH `postcss` advisories (arbitrary file read and path traversal via
  `sourceMappingURL`), by raising the pin to 8.5.25 and forcing it through overrides.

## [0.1.0] - 2026-08-03

Initial template.

### Added

- pnpm 11 + Turborepo monorepo with a single version catalog in
  `pnpm-workspace.yaml`.
- `apps/web`: Vite 8, React Router 8 (data mode, lazy routes), Tailwind 3,
  vendored shadcn/ui primitives.
- `apps/mobile`: Expo SDK 57, expo-router with `<Stack.Protected>` auth,
  NativeWind 4.
- `@repo/core`: axios client with typed `ApiError`, zod schemas, TanStack Query
  hooks with query-key factories, Zustand session store, i18n, PII-redacting
  logger. Platform differences arrive through a two-member `configureCore()`.
- `@repo/tokens`: one token source generating both apps' `global.css`, with drift
  and WCAG-AA contrast tests.
- `@repo/mocks`: MSW handlers plus a standalone Express mock API, so a fresh
  clone runs with no backend.
- Demo slice: auth + paginated posts CRUD, including an optimistic update with
  rollback (edit `post-fail` to see it).
- `pnpm gen feature` scaffolds a full vertical slice across all four layers.
- Quality gates: ESLint 10 flat config enforcing package boundaries, husky hooks,
  commitlint, PR-triggered CI on every protected branch, coverage thresholds, and
  build-output assertions for both the web CSS and the native bundle.
- `AGENTS.md` with a stale-training-data guard, and repo-local `.claude/` commands.

### Notes

- `light.destructive` deviates from stock shadcn (`0 72% 45%` rather than
  `0 84.2% 60.2%`) because the stock value fails WCAG AA at 3.66:1.
- TypeScript is pinned to 6.0.3, Tailwind to 3.4.19, Jest to 29 and Babel to 7 —
  each for a specific incompatibility documented in `docs/versions.md`.
