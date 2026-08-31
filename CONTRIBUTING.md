# Contributing

## Setup

```bash
make setup      # checks Node/pnpm, installs, writes .env, generates token CSS
make check      # confirm a clean clone passes the gate before you change anything
```

If `make check` fails on a fresh clone, that is a bug in the template — file it
rather than working around it.

## Branching

The OutCode flow, in full in
[docs/outcode-git-branching-strategy.md](docs/outcode-git-branching-strategy.md):

```
feature/* → v{MAJOR}.{MINOR}.{PATCH} → develop → uat → prod → main
```

Feature branches are cut from a **version** branch, not from `develop`. `main`
tracks what is live in the app stores.

Names: `feature/*`, `bugfix/*`, `hotfix/*`, `release/*`, `chore/*`, `docs/*`.
`scripts/branch-guard.sh` blocks commits on `main`/`prod`/`uat`/`develop` and warns
on anything else.

## Commits

Conventional Commits, enforced by commitlint on `commit-msg`:

```
feat(mobile): add comment threads
fix(core): roll back optimistic update when the server rejects it
chore(deps): bump vitest
```

Allowed scopes are in `commitlint.config.js`: `web`, `mobile`, `core`, `tokens`,
`mocks`, `config`, `ci`, `docs`, `deps`, `repo`.

## Before you push

`pre-push` runs `pnpm quality:check` — lint, typecheck, format, tests with
coverage thresholds, and the duplicate-dependency guard. It is the same gate CI
runs, **except** the E2E suite, which CI runs separately because it needs a browser.

Run `pnpm test:e2e` yourself before a PR that touches routing, the auth guard, or
anything in `main.tsx`. Those are exactly the places unit tests cannot see — see
docs/testing.md for the two bugs it caught.

`--no-verify` exists but using it means you own the CI failure. AGENTS.md tells
agents never to use it.

## Rules that are not style preferences

Each of these is enforced mechanically; the reasoning is in
[AGENTS.md](AGENTS.md).

- No `any`, no `console.*`, no raw hex colours, no `localStorage`.
- `@repo/core` never imports a platform API. If lint blocks an import, the code is
  in the wrong package.
- User-facing strings go through `t()`.
- Versions go in the catalog in `pnpm-workspace.yaml`, never in a package.json.
- Never edit `apps/*/global.css` — edit `packages/tokens/src/tokens.ts` and run
  `pnpm tokens:sync`.
- **No `eslint-disable`.** There are zero in this repo. If a rule seems wrong,
  change the rule in `packages/config/` with a reason, so the change is reviewed
  once rather than scattered.

## Adding a feature

Use the generator — it is the shared-UI substitute and it keeps the two platforms
recognisably the same:

```bash
pnpm gen feature --args comment comments /api/comments
pnpm fix          # required: eslint --fix AND prettier --write
```

Then replace the placeholder fields in the generated `schemas.ts`, make the
fixture match, and add the strings to `packages/core/src/i18n/locales/en.json`.

**If you change a shared hook or schema in `@repo/core`, update both apps in the
same PR.** That is the whole point of sharing logic, and a PR that changes one
side is how the two drift.

## Pull requests

Fill in [the template](.github/pull_request_template.md), including screenshots
for UI changes — both platforms if you touched shared code. `CI OK` must be green.
Approvals: 2 for `main`/`prod`, 1 for `uat`/`develop`.

## Upgrading dependencies

Read [docs/versions.md](docs/versions.md) first. Several pins are exact because the
newest version is actively broken here (TypeScript 7, Tailwind 4, Jest 30, Babel
8, `@sentry/react-native` 8, gesture-handler 3). Dependabot is configured to leave
those alone.

Expo packages are never bumped by hand:

```bash
pnpm --filter @repo/mobile exec expo install --check
```
