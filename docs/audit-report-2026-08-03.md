# Project audit — 2026-08-03

Baseline audit of the template at initial commit, against the OutCode project
checklist (110 items, 21 sections).

This file exists so the first real `/project-audit` on a cloned project has
something to diff against: what matters is a **regression** from this baseline, not
the absolute score. The eight non-passing items are known and tracked in
[audit-clickup-tasks.md](audit-clickup-tasks.md) — `/audit` should not re-report
them as findings.

## Project profile

| Field               | Value                   | How determined                                                                                   |
| ------------------- | ----------------------- | ------------------------------------------------------------------------------------------------ |
| `project_type`      | `client-work`           | Proprietary LICENSE, OutCode copyright                                                           |
| `platform`          | frontend (web + mobile) | Two client apps, no server or database in the repo                                               |
| `language_scope`    | `multi-locale`          | i18next configured, strings externalised, locale resolution per platform                         |
| `hosting`           | `vercel`                | `apps/web/vercel.json` present                                                                   |
| `typescript_strict` | `yes`                   | `strict: true` plus `noUncheckedIndexedAccess`, `noImplicitReturns`, `noUnusedLocals` and others |
| `team_size`         | `small`                 | CODEOWNERS names two teams                                                                       |

## Summary

| Section                        | Items   | Pass   | Fail  | Partial | N/A    | Score  |
| ------------------------------ | ------- | ------ | ----- | ------- | ------ | ------ |
| Coding Practices               | 5       | 5      | 0     | 0       | 0      | 100    |
| Security & Secrets             | 4       | 3      | 0     | 1       | 0      | 75     |
| CI/CD                          | 8       | 8      | 0     | 0       | 0      | 100    |
| Version Control                | 3       | 3      | 0     | 0       | 0      | 100    |
| Dependencies                   | 4       | 3      | 0     | 1       | 0      | 75     |
| Infrastructure                 | 5       | 2      | 0     | 0       | 3      | 100    |
| Code Review & Quality Gates    | 4       | 3      | 0     | 1       | 0      | 75     |
| Auth & Access Control          | 7       | 3      | 0     | 1       | 3      | 75     |
| Error Handling                 | 4       | 4      | 0     | 0       | 0      | 100    |
| Logging & Monitoring           | 5       | 4      | 0     | 1       | 0      | 80     |
| Performance                    | 4       | 3      | 0     | 0       | 1      | 100    |
| Accessibility                  | 4       | 4      | 0     | 0       | 0      | 100    |
| Internationalization (i18n)    | 3       | 3      | 0     | 0       | 0      | 100    |
| Developer Onboarding           | 4       | 4      | 0     | 0       | 0      | 100    |
| Testing                        | 8       | 8      | 0     | 0       | 0      | 100    |
| README                         | 15      | 14     | 0     | 0       | 1      | 100    |
| Release & Versioning           | 3       | 3      | 0     | 0       | 0      | 100    |
| API & Code Documentation       | 6       | 5      | 0     | 0       | 1      | 100    |
| Privacy & Compliance           | 5       | 1      | 0     | 3       | 1      | 25     |
| Incident Response & Operations | 4       | 2      | 0     | 0       | 2      | 100    |
| Database                       | 5       | 0      | 0     | 0       | 5      | -      |
| **Overall**                    | **110** | **85** | **0** | **8**   | **17** | **91** |

Score = 85 / (110 − 17) = **91%**

---

## Section 1: Coding Practices

| #   | Status | Evidence                                                                                                                                                                                                                                                                          |
| --- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 | Yes    | `packages/config/eslint/{base,logic-only,react-web,react-native}.js`. Project-specific rules, not just presets: `no-explicit-any`, `no-console`, raw-hex ban, `localStorage` ban, `StyleSheet.create` ban, package-boundary `no-restricted-imports`, `import-x/order` pathGroups. |
| 1.2 | Yes    | `.prettierrc.json`; conventions in `docs/conventions.md`.                                                                                                                                                                                                                         |
| 1.3 | Yes    | `pnpm format:check` in the `static` job of `.github/workflows/quality.yml`.                                                                                                                                                                                                       |
| 1.4 | Yes    | `apps/mobile/app.config.ts` maps `APP_ENV` to name/bundle id; `eas.json` has three profiles; GitHub Environments per branch; `docs/environments.md`.                                                                                                                              |
| 1.5 | Yes    | `.env.example`, fully commented, placeholders only.                                                                                                                                                                                                                               |

## Section 2: Security & Secrets

| #   | Status      | Evidence                                                                                                                                                                                                                                                                         |
| --- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1 | Yes         | `.gitignore` covers `.env*`, `*.pem`, `*.key`, `*.p8`, `*.p12`, `*.keystore`, `credentials.json`, `google-services.json`, `GoogleService-Info.plist`.                                                                                                                            |
| 2.2 | Yes         | No secrets in source. The plaintext passwords in `packages/mocks/src/fixtures/users.ts` are dev-only fixtures in a package excluded from production bundles (dynamic import behind `VITE_ENABLE_MOCKS`), and are labelled as such.                                               |
| 2.3 | **Partial** | GitHub Environments + EAS secrets scope secrets per environment, but there is no dedicated manager, so no rotation policy or access audit trail. Task 3.                                                                                                                         |
| 2.4 | Yes         | `packages/core/src/logger.ts` redacts PII keys recursively, cycle-safe and depth-limited; asserted by `src/__tests__/logger.test.ts`. Sentry runs `sendDefaultPii: false` and strips cookies in `beforeSend`. A login-response test asserts the password never crosses the wire. |

## Section 3: CI/CD

| #   | Status | Evidence                                                                                                                                     |
| --- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1 | Yes    | Seven workflows in `.github/workflows/`.                                                                                                     |
| 3.2 | Yes    | `static` job: `pnpm lint`, `pnpm format:check`.                                                                                              |
| 3.3 | Yes    | `test` job: Vitest with coverage + jest-expo.                                                                                                |
| 3.4 | Yes    | `quality.yml` triggers on PRs to `main`, `prod`, `uat`, `develop` **and** `v*.*.*`.                                                          |
| 3.5 | Yes    | `deploy-web.yml`, `release-mobile.yml`, `release.yml`, `merge-prod-to-main.yml`.                                                             |
| 3.6 | Yes    | `docs/delivery.md`, including first-time secret setup.                                                                                       |
| 3.7 | Yes    | `apps/web/Dockerfile`: multi-stage, digest-pinned bases, runs as `nginx` (non-root), `HEALTHCHECK`, and runs the CSS assertion during build. |
| 3.8 | Yes    | `docker-compose.yml` runs the mock API plus the production-shaped web container.                                                             |

## Section 4: Version Control

| #   | Status | Evidence                                                                                                                                                                                                            |
| --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1 | Yes    | Git initialised; strategy in `docs/outcode-git-branching-strategy.md`.                                                                                                                                              |
| 4.2 | Yes    | Documented, and checked by `scripts/branch-guard.sh` (warns on non-conforming names).                                                                                                                               |
| 4.3 | Yes    | `.github/rulesets/protected-branches.json` blocks direct pushes to all four protected branches; `scripts/branch-guard.sh` blocks the commit locally first. See 7.3 for the caveat that the ruleset must be applied. |

## Section 5: Dependencies

| #   | Status      | Evidence                                                                                                                                                                                                                                                                                                                                                                           |
| --- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5.1 | Yes         | `pnpm-lock.yaml` committed and not gitignored.                                                                                                                                                                                                                                                                                                                                     |
| 5.2 | Yes         | Single catalog in `pnpm-workspace.yaml`; manifests use `catalog:`. `.npmrc` sets `save-exact=true`.                                                                                                                                                                                                                                                                                |
| 5.3 | Yes         | `.github/dependabot.yml` (grouped, weekly) + `codeql.yml`.                                                                                                                                                                                                                                                                                                                         |
| 5.4 | **Partial** | `pnpm audit` found two HIGH `postcss` advisories, **both fixed** in this baseline (pinned 8.5.25 plus an `overrides` entry). One MODERATE remains: `uuid <11.1.1`, transitive via `expo → @expo/cli → @expo/config-plugins → xcode`, build-time and dev-only. Deliberately not overridden — forcing uuid ≥11 on a consumer written for the v3 API breaks `expo prebuild`. Task 10. |

## Section 6: Infrastructure

| #   | Status | Evidence                                                                                                         |
| --- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| 6.1 | N/A    | Platform-managed infrastructure (hosting = vercel).                                                              |
| 6.2 | N/A    | Adds complexity without benefit on client delivery (project_type = client-work).                                 |
| 6.3 | Yes    | `docs/delivery.md#rollback` — per surface, and explicit that a native mobile change has no rollback.             |
| 6.4 | N/A    | Vercel provides automatic preview deployments (hosting = vercel).                                                |
| 6.5 | Yes    | `docs/environments.md`: separate GitHub Environments, secrets, Vercel projects, Sentry environments, bundle ids. |

## Section 7: Code Review & Quality Gates

| #   | Status      | Evidence                                                                                                                                                           |
| --- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 7.1 | Yes         | `.github/pull_request_template.md`, including a both-platforms screenshot requirement for shared-code changes.                                                     |
| 7.2 | Yes         | `.github/CODEOWNERS`, with tighter ownership on `packages/config`, `.github`, `AGENTS.md` and the gate scripts. Team handles are placeholders to replace on clone. |
| 7.3 | **Partial** | The ruleset requiring `CI OK` ships as a file plus `scripts/setup-branch-protection.sh`, but is not enforced server-side until an admin runs it. Task 1.           |
| 7.4 | Yes         | `tsc --noEmit` per package via `pnpm typecheck` in the `static` job; strict plus `noUncheckedIndexedAccess`, `noImplicitReturns`, `noImplicitOverride`.            |

## Section 8: Auth & Access Control

| #   | Status      | Evidence                                                                                                                                                                                                 |
| --- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8.1 | Yes         | `apps/web/vercel.json`: HSTS `max-age=63072000; includeSubDomains; preload`, plus CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`. Mirrored in `nginx.conf`.            |
| 8.2 | **Partial** | Token lifetime is the API's. The client has no refresh flow by design — a 401 clears the session — so a short lifetime means frequent forced sign-outs, and web loses the session on reload. Task 5.     |
| 8.3 | N/A         | Backend concern — revocation is server-side. The client does call `POST /api/auth/logout` and clears state regardless of the result.                                                                     |
| 8.4 | N/A         | Backend concern.                                                                                                                                                                                         |
| 8.5 | N/A         | Backend concern. Required of the API in `docs/api/README.md`.                                                                                                                                            |
| 8.6 | Yes         | zod on both directions: `parseRequestBody` validates every request body, `Schema.parse` every response. Bad input maps to `kind:'validation'` with field errors; a bad response maps to `kind:'schema'`. |
| 8.7 | Yes         | `loginInputSchema` enforces 8+ characters, per NIST.                                                                                                                                                     |

## Section 9: Error Handling

| #   | Status | Evidence                                                                                                                                                               |
| --- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9.1 | Yes    | One `ApiError` shape with a `kind` discriminant, `status` and `fieldErrors`; registered as TanStack Query's default error type so `error.kind` type-checks everywhere. |
| 9.2 | Yes    | `toApiError` at every api boundary; axios interceptors; `RouteError` errorElement on web.                                                                              |
| 9.3 | Yes    | Retry predicate in `packages/core/src/query/client.ts` — network and 5xx only, max 2, exponential backoff capped at 8s. Fully unit-tested.                             |
| 9.4 | Yes    | Sentry captures unhandled throws; `RouteError` logs via `logger.error`.                                                                                                |

## Section 10: Logging & Monitoring

| #    | Status      | Evidence                                                                                                           |
| ---- | ----------- | ------------------------------------------------------------------------------------------------------------------ |
| 10.1 | Yes         | `logger` emits JSON in production, readable text in development.                                                   |
| 10.2 | Yes         | `debug`/`info`/`warn`/`error` with an ordered minimum level; default `info` in production.                         |
| 10.3 | Yes         | `@sentry/react` (web) and `@sentry/react-native` (mobile), opt-in by DSN; sourcemaps uploaded in `deploy-web.yml`. |
| 10.4 | **Partial** | Sentry only. No Datadog/CloudWatch/ELK pipeline for the full log stream. Task 4.                                   |
| 10.5 | Yes         | Automatic redaction (see 2.4), with tests.                                                                         |

## Section 11: Performance

| #    | Status | Evidence                                                                                                                                                                                                                                            |
| ---- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11.1 | Yes    | TanStack Query with **explicit** `staleTime` (60s) and `gcTime` (5m) rather than defaults; immutable `Cache-Control` on content-hashed assets in `vercel.json` and `nginx.conf`.                                                                    |
| 11.2 | Yes    | Read as frontend data-fetching efficiency: query deduplication, hierarchical key factories for precise invalidation, `useInfiniteQuery` for pagination, `enabled` to avoid pointless requests, and optimistic updates to avoid refetch round trips. |
| 11.3 | N/A    | Background processing is a backend concern (platform = frontend).                                                                                                                                                                                   |
| 11.4 | Yes    | Route-level `lazy()` in `apps/web/src/router.tsx` — main chunk 612 kB → **195 kB** (61.8 kB gzip). MSW is dynamically imported so it is code-split out of production entirely.                                                                      |

## Section 12: Accessibility

| #    | Status | Evidence                                                                                                                                                                                                                                                                                                                     |
| ---- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 12.1 | Yes    | `<html lang="en">`, `header`/`nav`/`main` landmarks, `output` with `aria-busy` for loading regions, `role="alert"` for errors.                                                                                                                                                                                               |
| 12.2 | Yes    | `eslint-plugin-jsx-a11y` on web; `accessibilityRole`/`accessibilityState`/`accessibilityLabelledBy`/`accessibilityLiveRegion` on mobile.                                                                                                                                                                                     |
| 12.3 | Yes    | axe-core in `apps/web/src/features/auth/__tests__/login-page.test.tsx`; jsx-a11y in lint; Lighthouse nightly. The axe `color-contrast` rule is explicitly disabled with a comment, because jsdom has no canvas and it would otherwise be silently skipped rather than passing.                                               |
| 12.4 | Yes    | `packages/tokens/src/__tests__/contrast.test.ts` asserts WCAG AA (4.5:1) on 8 foreground/background pairs in **both** schemes, plus 3:1 on the focus ring. This caught a real problem: stock shadcn's light `destructive` is 3.66:1, so the token was darkened to `0 72% 45%` (5.55:1). Deviation documented in `tokens.ts`. |

## Section 13: Internationalization

| #    | Status | Evidence                                                                                                                                                                                                                                                                 |
| ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 13.1 | Yes    | `i18next` + `react-i18next` in `packages/core/src/i18n/`.                                                                                                                                                                                                                |
| 13.2 | Yes    | All strings in `locales/en.json`, read through `t()`. Enforced: a `no-restricted-syntax` rule on `JSXText` fails lint on raw user-facing text in feature and screen files. Tests assert rendered English, so a missing key fails rather than silently rendering the key. |
| 13.3 | Yes    | `resources` map, `resolveLanguage()` narrowing arbitrary locale tags, `fallbackLng`, and per-platform detection injected by the app (`navigator.language` / `expo-localization`) so core stays platform-agnostic.                                                        |

## Section 14: Developer Onboarding

| #    | Status | Evidence                                                                                                                                                                            |
| ---- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 14.1 | Yes    | `CONTRIBUTING.md`.                                                                                                                                                                  |
| 14.2 | Yes    | `make setup` → `scripts/setup.sh`, which verifies the Node floor, bootstraps pnpm via Corepack, writes `.env`, installs, generates token CSS and checks for duplicate dependencies. |
| 14.3 | Yes    | `docs/onboarding.md` (a timed day-one path), `docs/development-workflow.md`, `docs/patterns.md`.                                                                                    |
| 14.4 | Yes    | `.env.example` + `docs/env-vars.md`.                                                                                                                                                |

## Section 15: Testing

| #    | Status      | Evidence                                                                                                                                                                                                                                              |
| ---- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 15.1 | Yes         | 110 Vitest tests across 11 files + 4 jest-expo tests. Covers error mapping, retry policy, auth store hydration including corrupt persisted data, pagination boundaries, optimistic rollback, token contrast, CSS drift, and the mock/schema contract. |
| 15.2 | Yes         | Root `vitest.config.ts` with `projects`, per-package configs, `apps/mobile/jest.config.js`.                                                                                                                                                           |
| 15.3 | Yes         | `test` job in `quality.yml`.                                                                                                                                                                                                                          |
| 15.4 | Yes         | `@vitest/coverage-v8`, run by `pnpm test:coverage` in CI, artifact uploaded.                                                                                                                                                                          |
| 15.5 | Yes         | Thresholds in `vitest.config.ts` — global 65/65/65/50, `packages/core/src/**` 80/80/80/70 — and `coverage.include` is set **explicitly**, without which Vitest 4 counts only loaded files and any threshold passes trivially.                         |
| 15.6 | **Partial** | Integration tests exist (hook tests exercise api + Query + MSW together; `mock-contract.test.ts` verifies the API contract at runtime). No E2E on either platform. Task 2.                                                                            |
| 15.7 | Yes         | `packages/mocks`: deterministic fixtures (48 posts, no randomness, so CI is reproducible), `resetDb()` between tests, and a seeded always-failing record for the rollback path.                                                                       |
| 15.8 | **Partial** | `@repo/core` is well covered; the app layers are thin (two web component tests plus an a11y check, one mobile test). The list/detail/create/edit pages have no tests, which is why the global floor is 65. Task 6.                                    |

## Section 16: README

| #     | Status | Evidence                                                                                                               |
| ----- | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| 16.1  | Yes    | `README.md`.                                                                                                           |
| 16.2  | Yes    | §1, including the stated goal of agent-authored development.                                                           |
| 16.3  | Yes    | §2, a version table with the non-obvious pins called out.                                                              |
| 16.4  | Yes    | §3.                                                                                                                    |
| 16.5  | Yes    | §4 + `docs/env-vars.md`.                                                                                               |
| 16.6  | N/A    | Backend concern — this repo contains no database. §5 states that explicitly and points at the mock layer used locally. |
| 16.7  | Yes    | §6 with a required/optional column.                                                                                    |
| 16.8  | Yes    | §8, Mermaid `gitGraph` + link to the org standard.                                                                     |
| 16.9  | Yes    | §9.                                                                                                                    |
| 16.10 | Yes    | §10, inline Mermaid + `docs/architecture/`.                                                                            |
| 16.11 | Yes    | §11.                                                                                                                   |
| 16.12 | Yes    | §12, workflow table.                                                                                                   |
| 16.13 | Yes    | §13.                                                                                                                   |
| 16.14 | Yes    | §14 → `docs/troubleshooting.md`.                                                                                       |
| 16.15 | Yes    | §15 → `docs/known-issues.md`.                                                                                          |

## Section 17: Release & Versioning

| #    | Status | Evidence                                                                                                           |
| ---- | ------ | ------------------------------------------------------------------------------------------------------------------ |
| 17.1 | Yes    | Semver; `package.json` version is the source of truth; `release.yml` tags `v{version}`.                            |
| 17.2 | Yes    | `CHANGELOG.md`, Keep-a-Changelog, with an `## [Unreleased]` section the PR template requires.                      |
| 17.3 | Yes    | `docs/delivery.md` + `docs/outcode-git-branching-strategy.md`, including the store-approval gate on `prod → main`. |

## Section 18: API & Code Documentation

| #    | Status | Evidence                                                                                                                                                                                            |
| ---- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 18.1 | Yes    | `docs/api/README.md` — auth, pagination envelope, error contract, status-code mapping, and explicit requirements on the API.                                                                        |
| 18.2 | Yes    | Hand-written and curated, not generated. States that the zod schemas are the machine-readable version and win on disagreement, and explains why a spec generated from the client would be circular. |
| 18.3 | Yes    | Four Mermaid diagrams: system context, data-flow sequence, dependency graph with forbidden edges, branch `gitGraph`.                                                                                |
| 18.4 | N/A    | TypeScript strict plus typed interfaces serve as documentation (`typescript_strict = yes`). Substantial JSDoc is present regardless, particularly on the public surface of `@repo/core`.            |
| 18.5 | Yes    | `docs/` with an index (`docs/README.md`) grouped by task.                                                                                                                                           |
| 18.6 | Yes    | `LICENSE` at root — proprietary, matching `project_type = client-work`.                                                                                                                             |

## Section 19: Privacy & Compliance

| #    | Status      | Evidence                                                                                                                                                                                                                                        |
| ---- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 19.1 | **Partial** | `docs/security-and-privacy.md` documents that legal screens are a launch requirement and that a privacy policy URL blocks store submission, but no policy or terms exist — the text is project-specific. Task 7.                                |
| 19.2 | **Partial** | The client-side data inventory is documented (session token, current user, nothing outliving the session). No retention table with durations and an owner. Task 9.                                                                              |
| 19.3 | Yes         | Access tokens are **memory-only** on web (never `localStorage`, enforced by `no-restricted-globals`) and in hardware-backed SecureStore on mobile, with a 2000-byte guard because iOS caps keychain items at 2048 and otherwise fails opaquely. |
| 19.4 | **Partial** | Erasure/export/consent are backend capabilities, documented as such; no client-side flows. Task 8.                                                                                                                                              |
| 19.5 | N/A         | Backend concern — no database in this repo.                                                                                                                                                                                                     |

## Section 20: Incident Response & Operations

| #    | Status | Evidence                                                                                                                                                                                                                           |
| ---- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 20.1 | Yes    | `docs/runbook.md` — severity ladder, first five minutes, Sentry triage keyed to `ApiError.kind`, comms template, post-mortem with a "which gate should have caught this?" question.                                                |
| 20.2 | N/A    | Managed at org level (project_type = client-work, team_size = small).                                                                                                                                                              |
| 20.3 | N/A    | Managed at company level (team_size = small).                                                                                                                                                                                      |
| 20.4 | Yes    | `GET /health` on the web deployment via `apps/web/public/health.json` plus the `vercel.json` rewrite exclusion and an nginx location; the mock server also exposes `/health`. The response states what it does and does not prove. |

## Section 21: Database

| #    | Status | Evidence                                                                                            |
| ---- | ------ | --------------------------------------------------------------------------------------------------- |
| 21.1 | N/A    | Backend concern — no database in this repo.                                                         |
| 21.2 | N/A    | Backend concern.                                                                                    |
| 21.3 | N/A    | Backend concern.                                                                                    |
| 21.4 | N/A    | Backend concern. Local development uses in-memory fixtures in `packages/mocks`, not database seeds. |
| 21.5 | N/A    | Backend concern.                                                                                    |

---

## Notes on this baseline

**Zero `No` results is not the same as zero gaps.** Eight items are Partial, and each
one is a real limitation with a ticket, not a wording trick. In particular §19
scores 25% because a template genuinely cannot supply reviewed legal text or
implement backend-dependent data-subject flows.

**Items most likely to be graded differently by a future run:**

- `20.4` — a static JSON file may not be accepted as an "endpoint".
- `12.4` — this is a token-level guarantee, not rendered-UI verification.
- `18.1`/`18.2` — a hand-written contract may be judged thinner than an OpenAPI spec.

**What the E2E suite found on its first run**, which is the clearest argument for it:
two bugs that all unit tests missed — `main.tsx` never called `hydrate()`, so the
web app hung on a loading state instead of redirecting to login; and the index
route's prefetch loader ran before the auth guard could redirect, 401'd, and threw
into the error boundary. Both were first-load-breaking. See docs/known-issues.md.

**Profile sensitivity:** if a clone is detected as `internal-product` rather than
`client-work`, items 6.2 and 20.2 become gradeable (and would likely be `No`),
moving the denominator to 95 and the score to ~87%. Removing `vercel.json` to
self-host makes 6.1 and 6.4 gradeable in the same way.
