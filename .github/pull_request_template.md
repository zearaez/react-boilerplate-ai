# What and why

<!-- What changes, and what problem it solves. Link the ticket. -->

Closes:

## How to verify

<!-- The exact steps a reviewer runs. "Ran the tests" is not verification. -->

1.

## Screenshots / recordings

<!-- Required for any UI change. BOTH platforms if you touched a shared hook or
     schema in @repo/core — the point of sharing logic is that both apps change
     together, so show both. -->

| Web | Mobile |
| --- | ------ |
|     |        |

## Checklist

- [ ] `pnpm quality:check` passes locally
- [ ] Branch is `feature/*` (or `bugfix/*`/`hotfix/*`) cut from a `v{MAJOR}.{MINOR}.{PATCH}` branch
- [ ] Commits follow Conventional Commits
- [ ] New logic has a test; new user-facing strings go through `t()`
- [ ] No new `eslint-disable`, no widened types, no lowered coverage threshold
- [ ] Colours/spacing come from `@repo/tokens` — no raw hex
- [ ] If a shared hook or schema changed, BOTH apps were updated in this PR
- [ ] `.env.example` and `docs/env-vars.md` updated if a variable was added
- [ ] `CHANGELOG.md` updated under `## [Unreleased]`

## Risk

<!-- What could this break, and how would we notice? What is the rollback?
     See docs/delivery.md. -->
