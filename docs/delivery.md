# Delivery — CI, deployment, release, rollback

## CI

| Workflow                 | Trigger                                                               | Does                                         |
| ------------------------ | --------------------------------------------------------------------- | -------------------------------------------- |
| `quality.yml`            | PR to **any** protected branch, push to `develop`/`uat`/`prod`/`main` | the gate                                     |
| `deploy-web.yml`         | push to `uat`/`prod`                                                  | Vercel deploy + Sentry release               |
| `release-mobile.yml`     | manual, push to `prod`                                                | EAS build/submit                             |
| `release.yml`            | push to `prod`                                                        | tag + GitHub release                         |
| `merge-prod-to-main.yml` | manual, environment-gated                                             | post-store-approval merge                    |
| `nightly.yml`            | cron                                                                  | Android assemble, Lighthouse, doc-link check |
| `codeql.yml`             | PR + weekly                                                           | static analysis                              |

`quality.yml` runs on **every** protected target branch, not just `main`. A
deploy-only workflow means nothing is checked until after merge, which is the single
most common gap in our repos.

### The gate

Four parallel jobs, then an aggregator:

- **static** — lint, `tsc --noEmit`, `prettier --check`, single-version guard, token
  drift check
- **test** — Vitest with coverage thresholds, jest-expo
- **build-web** — `vite build`, then `assert-css-output.mjs`
- **e2e** — Playwright against the production build with mocks on. No backend
  needed, ~1 minute including the chromium install
- **mobile-check** — `expo-doctor`, `expo install --check`, `expo export`, then
  `assert-native-styles.mjs`

**`CI OK` is the only required status check.** It `needs` every job, so adding a job
without adding it there would let it fail silently — one place has to be right
instead of five.

### The two build-output gates

Both exist because a unit test cannot catch what they catch:

- `assert-css-output.mjs` — Tailwind purged the entire `.dark` palette once while dev
  looked fine, and Rolldown has tree-shaken class registrations before.
- `assert-native-styles.mjs` — if NativeWind's babel wiring breaks, every `className`
  becomes a no-op with **no error** and `expo export` still succeeds.

### Mobile CI without a Mac

| Check                                 | Runner     | Time      | In the gate?                              |
| ------------------------------------- | ---------- | --------- | ----------------------------------------- |
| lint / tsc / jest                     | ubuntu     | seconds   | yes                                       |
| `expo-doctor`, `expo install --check` | ubuntu     | ~1 min    | yes                                       |
| `expo export --platform all`          | ubuntu     | 2-4 min   | **yes** — this is the mobile build signal |
| Android prebuild + `assembleDebug`    | ubuntu     | 12-20 min | nightly                                   |
| iOS native compile                    | macOS only | 20-30 min | never — EAS                               |

`expo export` catches essentially everything a PR realistically breaks: bad imports,
missing assets, Metro resolution errors, plugin misconfiguration, broken NativeWind
transforms. Native compilation only adds native-module and config-plugin problems,
which change rarely.

### Why EAS is not in the gate

A build is 10-30 minutes, consumes plan credits, and the pnpm/Corepack interaction is
a known rough edge. An intermittently failing **required** check destroys trust in
every other gate. It lives in `release-mobile.yml` instead.

## Deploying the web app

Automatic on push to `uat` or `prod`. Manually:

```bash
pnpm --filter @repo/web build
node scripts/assert-css-output.mjs apps/web/dist
cd apps/web && pnpm dlx vercel@latest deploy --prebuilt --prod
```

`vercel.json` carries the CSP, HSTS and the SPA rewrite — the rewrite matters, because
without it any deep link 404s on refresh.

Self-hosting: `apps/web/Dockerfile` (multi-stage, non-root, healthcheck) with the
bundled `nginx.conf`.

**First-time setup:** create the Vercel project, then set `VERCEL_TOKEN`,
`VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` as secrets and
`VITE_API_URL`, `SENTRY_ORG`, `SENTRY_PROJECT` as variables, per GitHub Environment.

## Releasing mobile

```bash
cd apps/mobile
pnpm dlx eas-cli@latest build --profile preview --platform all
pnpm dlx eas-cli@latest submit --profile production --platform ios
```

Run EAS commands **from `apps/mobile`**, not the repo root.

Three profiles in `eas.json`; `appVersionSource: "remote"` so EAS owns build numbers.
If a build fails at the install step, see the `corepack` note in that file and
[known-issues.md](known-issues.md).

## Versioning and release

Semantic versioning. `package.json` version is the source of truth; `release.yml`
tags `v{version}` on push to `prod` and generates notes from Conventional Commits.
`CHANGELOG.md` is the human-curated summary — add your entry under `## [Unreleased]`
in the same PR.

`prod → main` is manual and requires the store approval reference.

## Rollback

**Web** — promote the previous deployment in Vercel (instant, no rebuild):

```bash
pnpm dlx vercel@latest rollback <previous-deployment-url>
```

Self-hosted: redeploy the previous image tag.

**Mobile, JS-only change** — `eas update --channel prod` with the previous commit, or
`eas channel:rollout` to point the channel back. Reaches users on next launch.

**Mobile, native change** — there is no rollback. Halt the phased release in App Store
Connect / Play Console and ship a hotfix. This asymmetry is why native changes belong
in their own release.

**Always:** note it in the incident log, and open a PR reverting the change on the
branch it came from. A rollback without a revert gets re-deployed by the next merge.
