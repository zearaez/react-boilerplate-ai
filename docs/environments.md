# Environments

|                    | local                         | uat                | production                |
| ------------------ | ----------------------------- | ------------------ | ------------------------- |
| Branch             | any                           | `uat`              | `prod`                    |
| Web URL            | `localhost:5173`              | set per project    | set per project           |
| API                | MSW / `localhost:4000`        | UAT API            | production API            |
| Web hosting        | Vite dev server               | Vercel preview     | Vercel production         |
| Mobile app name    | Repo Starter (Dev)            | Repo Starter (UAT) | Repo Starter              |
| Bundle id          | `com.outcode.repostarter.dev` | `…​.uat`           | `com.outcode.repostarter` |
| EAS profile        | `development`                 | `preview`          | `production`              |
| EAS channel        | —                             | `uat`              | `prod`                    |
| Sentry env         | `development` (usually off)   | `uat`              | `production`              |
| GitHub environment | —                             | `uat`              | `production`              |

The three mobile bundle ids differ so all three builds can be installed on one
device at once — which is what makes "does this reproduce on UAT?" answerable
without uninstalling anything.

## Isolation

Environments share no data. `uat` and `production` are separate GitHub
Environments with separate secrets, separate Vercel projects, and separate Sentry
environments. Nothing in this repo can read production secrets from a UAT deploy.

Locally there is no shared state at all: mocks are in-memory and reset on restart.

## Adding an environment

1. Add a branch and the ruleset entry in `.github/rulesets/protected-branches.json`.
2. Add a GitHub Environment with its own secrets and variables.
3. Add the name to the `APP_ENV` maps in `apps/mobile/app.config.ts`.
4. Add an EAS profile in `apps/mobile/eas.json`.
5. Add the row above.
