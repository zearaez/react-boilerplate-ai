# Environment variables

Source of truth: [`.env.example`](../.env.example). Web variables are **also** typed
in `apps/web/src/vite-env.d.ts` — without that, `import.meta.env.VITE_TYPO` is `any`
and a misspelling is silently `undefined` at runtime.

Adding a variable means three edits: `.env.example`, the type declaration (web), and
this table.

## Web — `apps/web`

Only `VITE_`-prefixed variables reach the bundle.

| Variable                    | Required | Default / example       | Notes                                                                                                                                                                                                                 |
| --------------------------- | -------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL`              | yes*     | `http://localhost:4000` | Ignored while mocks are on. \*Falls back to `window.location.origin`.                                                                                                                                                 |
| `VITE_ENABLE_MOCKS`         | yes      | `true`                  | `'true'` runs entirely on MSW — no backend needed. Set `'false'` for a real API.                                                                                                                                      |
| `VITE_API_PROXY_TARGET`     | no       | _(unset — no proxy)_    | Dev only. Set with `VITE_API_URL=/api` to proxy the API through Vite so it is same-origin — required for the httpOnly refresh cookie over plain HTTP. See [api/auth-cookie-contract.md](api/auth-cookie-contract.md). |
| `VITE_SENTRY_DSN`           | no       | _(empty)_               | Empty disables Sentry entirely: no init, no network.                                                                                                                                                                  |
| `VITE_APP_ENV`              | no       | `development`           | `development` \| `uat` \| `production`. Tags Sentry events.                                                                                                                                                           |
| `VITE_BUG_REPORTER_ENABLED` | no       | _(unset — enabled)_     | Only `'false'` disables the in-app bug reporter. See [bug-reporter.md](bug-reporter.md).                                                                                                                              |

## Mobile — `apps/mobile`

Only `EXPO_PUBLIC_`-prefixed variables reach the bundle. `APP_ENV` is build-time
only (read by `app.config.ts`).

| Variable                           | Required | Default / example   | Notes                                                                                                                                                                                                                                            |
| ---------------------------------- | -------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `EXPO_PUBLIC_API_URL`              | no       | _(unset)_           | **Usually leave unset.** `lib/api-url.ts` derives your machine's LAN address from the Expo dev server, which is what makes the mock API reachable from a physical device without hand-editing an IP. Set it only for a real backend or a tunnel. |
| `EXPO_PUBLIC_SENTRY_DSN`           | no       | _(empty)_           | As web.                                                                                                                                                                                                                                          |
| `EXPO_PUBLIC_BUG_REPORTER_ENABLED` | no       | _(unset — enabled)_ | Only `'false'` disables the in-app bug reporter. Screen capture needs a dev build regardless. See [bug-reporter.md](bug-reporter.md).                                                                                                            |
| `APP_ENV`                          | no       | `development`       | Also selects the app name and bundle-id suffix in `app.config.ts`.                                                                                                                                                                               |

## Mock server — `packages/mocks`

| Variable    | Default | Notes                                                          |
| ----------- | ------- | -------------------------------------------------------------- |
| `MOCK_PORT` | `4000`  | Keep in sync with `MOCK_PORT` in `apps/mobile/lib/api-url.ts`. |

## Nothing here is secret

Anything prefixed `VITE_` or `EXPO_PUBLIC_` is **inlined into a shippable bundle**
and readable by anyone with the app. A Sentry DSN is fine — it is a write-only
ingest endpoint. An API key is not.

Real secrets live in GitHub Environments (CI) and EAS secrets (mobile builds). See
[security-and-privacy.md](security-and-privacy.md).

## Reading them in code

- **Web:** `import.meta.env.VITE_X`, typed by `vite-env.d.ts`.
- **Mobile:** `readEnv('X')` from `apps/mobile/lib/env.ts`. Not bare
  `process.env.X` — React Native's types redeclare `process.env` with an `any` index
  signature, so a bare read is an `any` the lint rules reject. `readEnv` narrows once
  and treats `''` as unset, which is what CI actually passes.
