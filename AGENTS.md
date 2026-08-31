<!-- BEGIN:stale-training-data -->

# STOP. Your training data is wrong about this stack.

Every library below shipped breaking changes after your cutoff, and several have
an npm `latest` that does **not** work here. Do not write code from memory. Open
the URL for the thing you are touching, then write.

| Library        | Pinned          | Read this exact URL                                              | What you'll get wrong                                              |
| -------------- | --------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| Expo           | SDK 57          | https://docs.expo.dev/versions/v57.0.0/                          | Module versions are now `~57.x`, not `~18.x`                       |
| expo-router    | ~57.0.9         | https://docs.expo.dev/router/advanced/protected/                 | Auth is `<Stack.Protected>`, not a `router.replace()` effect       |
| NativeWind     | 4.2.6           | https://www.nativewind.dev/docs/getting-started/installation     | v4 needs a Babel preset + `tailwind.config`, not v5's CSS-first    |
| Tailwind CSS   | **3.4.19**      | https://v3.tailwindcss.com/docs                                  | tailwindcss.com now serves **v4** docs — wrong for this repo       |
| React Router   | 8.3.0           | https://reactrouter.com/                                         | The package is `react-router`; `react-router-dom` is frozen at 7   |
| Vite           | 8.2.0           | https://vite.dev/guide/                                          | Rolldown, not Rollup: `rolldownOptions`, `oxc` not `esbuild`       |
| Vitest         | 4.1.10          | https://vitest.dev/guide/migration                               | `projects` not `workspace`; `coverage.include` default changed     |
| ESLint         | 10.8.0          | https://eslint.org/docs/latest/use/configure/configuration-files | Flat config only — eslintrc is REMOVED                             |
| TypeScript     | **6.0.3 exact** | https://www.typescriptlang.org/docs/                             | Do NOT upgrade. TS 7 has no compiler API; tseslint caps at <6.1    |
| TanStack Query | 5.101.4         | https://tanstack.com/query/latest/docs/framework/react/overview  | Object syntax only; `cacheTime` is now `gcTime`                    |
| zod            | 4.4.3           | https://zod.dev/                                                 | `z.email()` / `z.iso.datetime()`, not `z.string().email()`         |
| RNTL           | 14.0.1          | https://callstack.github.io/react-native-testing-library/        | `render` is **async** — you must `await` it                        |
| Jest (mobile)  | **29.7.0**      | https://jestjs.io/docs/29.x/configuration                        | jest-expo@57 needs Jest **29**, not 30                             |
| Babel          | **7.29.7**      | https://babeljs.io/docs/                                         | Babel 8 breaks babel-jest — the RN toolchain is on 7               |
| bug-reporter   | 2.0.0 (all 3)   | https://www.npmjs.com/package/@outcode/bug-reporter-web          | v2 web is `mountBugReporter()`; React `<BugReporterButton>` was v1 |

`pnpm-workspace.yaml` is the only place versions live. If a URL 404s, say so and
stop — do not substitute a remembered API.

<!-- END:stale-training-data -->

<!-- BEGIN:repo-map -->

## Where code goes

Two apps, four packages. That is the whole repo.

| Building…                                               | Goes in                              | Never in           |
| ------------------------------------------------------- | ------------------------------------ | ------------------ |
| API call, zod schema, query hook, query key, auth store | `packages/core/src/features/<name>/` | either app         |
| Colour, radius                                          | `packages/tokens/src/tokens.ts`      | a className        |
| Mock endpoint or fixture                                | `packages/mocks/src/`                | a test file        |
| Web page or component                                   | `apps/web/src/`                      | `packages/core`    |
| Mobile screen (a route)                                 | `apps/mobile/app/`                   | `packages/core`    |
| Mobile component (not a route)                          | `apps/mobile/components/`            | `apps/mobile/app/` |
| Lint or tsconfig change                                 | `packages/config/`                   | a package          |

**`@repo/core` is platform-agnostic.** It must never import `react-native`,
`expo-*`, `react-dom`, `@repo/tokens`, or touch `window`/`document`. Platform
differences arrive through `configureCore()` (`src/runtime.ts`) — two members,
`apiUrl` and `storage`, and that is deliberately all.

ESLint enforces every line of that table. **If the linter blocks an import, the
code is in the wrong package.** Do not add an `eslint-disable` — there are zero in
this repo and it should stay that way.

Data flow, same on both platforms:

```
Screen → useXQuery (core) → queryKeys factory → axios client → auth interceptor
       → API → zod.parse → ApiError | Data
```

<!-- END:repo-map -->

<!-- BEGIN:hard-rules -->

## Hard rules — CI blocks these, so fixing them is not optional

Every rule here has a mechanical check. A rule with no enforcement is advice, and
advice gets dropped under context pressure — so if you add a rule to this file,
add the check too, or delete the rule.

| Rule                                                                          | Enforced by                                       |
| ----------------------------------------------------------------------------- | ------------------------------------------------- |
| No `any`. Use `unknown` plus a zod parse, or write the type.                  | `@typescript-eslint/no-explicit-any`              |
| No `console.*`. Use `logger` from `@repo/core`.                               | `no-console`                                      |
| No raw colours (`#fff`, `rgb()`). Add the token to `@repo/tokens` first.      | `no-restricted-syntax`                            |
| No `localStorage`/`sessionStorage` outside `apps/web/src/lib/storage.ts`.     | `no-restricted-globals`                           |
| No `StyleSheet.create` in mobile. Use NativeWind `className`.                 | `no-restricted-properties`                        |
| Every user-facing string goes through `t()`.                                  | `no-restricted-syntax` on `JSXText`               |
| Every API response is `zod.parse`d before it leaves the api layer.            | `no-unsafe-*` + review                            |
| Imports ordered, blank line between groups.                                   | `import-x/order` — run `pnpm lint:fix`            |
| No import cycles; no undeclared dependencies.                                 | `import-x/no-cycle`, `no-extraneous-dependencies` |
| One copy of react / react-dom / react-query / tailwindcss.                    | `scripts/assert-single-version.mjs`               |
| `global.css` matches `tokens.ts`.                                             | token drift test + CI                             |
| Coverage stays above the thresholds in `vitest.config.ts`.                    | `vitest --coverage`                               |
| Conventional Commits; branch is `feature/*` cut from a `v{M}.{m}.{p}` branch. | commitlint + `scripts/branch-guard.sh`            |

<!-- END:hard-rules -->

<!-- BEGIN:never-do -->

## Never do these

- **Never** `npm install` or `yarn add`. This is pnpm 11: `pnpm add --filter <pkg> <dep>`.
  A stray `npm install` corrupts the workspace.
- **Never** hardcode a version in a `package.json`. Add it to the catalog in
  `pnpm-workspace.yaml` and write `catalog:` (or `catalog:expo`).
- **Never** import `@react-navigation/*`. expo-router forked away from React
  Navigation in SDK 56; those imports resolve to a second navigator and break at
  runtime.
- **Never** import `react-router-dom`. It does not exist at v8.
- **Never** write Tailwind v4 syntax (`@theme`, `@import "tailwindcss"`,
  CSS-first config). This repo is Tailwind 3 with `tailwind.config.ts`.
- **Never** upgrade `typescript` past 6.0.3, `tailwindcss` past 3, `nativewind`
  past 4, `jest` past 29, or `@babel/core` past 7. Each one silently breaks
  something — see `docs/versions.md`.
- **Never** upgrade `react-native-gesture-handler` to 3.x, or bump any `expo-*`
  package by hand. Run `pnpm --filter @repo/mobile exec expo install --check`.
- **Never** install `eslint-plugin-import` (unmaintained — it's
  `eslint-plugin-import-x`, prefix `import-x/`), `eslint-plugin-react-compiler`
  (dead — the rules live in `eslint-plugin-react-hooks` 7), or
  `eslint-plugin-prettier` (we use `eslint-config-prettier/flat`, last).
- **Never** add `watchFolders`, `resolver.nodeModulesPaths` or
  `resolver.extraNodeModules` to `metro.config.js`. Expo auto-detects monorepos;
  adding them overrides that and breaks pnpm resolution.
- **Never** move `react-native-worklets/plugin` out of last position in
  `babel.config.js`.
- **Never** edit `apps/web/src/global.css` or `apps/mobile/global.css`. They are
  generated — edit `packages/tokens/src/tokens.ts` or the app's
  `styles/extra.css`, then run `pnpm tokens:sync`.
- **Never** add a route `action` in the web router. Mutations go through
  `useMutation` so the logic is shared with mobile.
- **Never** let a route `loader` throw. It runs even when the parent guard would
  redirect, so a failure becomes an error boundary on first load. Return early and
  swallow — see `apps/web/src/router.tsx`.
- **Never** put UI state in `@repo/core`, and never put server data in a Zustand
  store. The decision table is in docs/patterns.md §11.
- **Never** use shadcn's `FormLabel`/`FormDescription` outside a `<FormField>` —
  they call `useFormField()` and throw.
- **Never** use `.refine()` for a rule about a specific field; use `superRefine`
  with a `path` so the error lands on that field.
- **Never** add `useMemo`/`useCallback`/`React.memo` "for performance" without a
  measurement. Add them when the linter names a specific dependency problem.
- **Never** add an `eslint-disable`, widen a type to `any`, or lower a coverage
  threshold to make CI pass. Fix the code, or stop and explain.
- **Never** commit to `main`/`prod`/`uat`/`develop`, and never use `--no-verify`.
- **Never** put a real secret in `.env.example`, a fixture, or anything prefixed
  `VITE_`/`EXPO_PUBLIC_` — those are inlined into a shippable bundle.

<!-- END:never-do -->

<!-- BEGIN:recipes -->

## Recipes — copy these, don't invent

**A whole new feature.** Don't hand-write it:

```bash
pnpm gen feature --args comment comments /api/comments
pnpm fix   # required: eslint --fix AND prettier --write
```

That emits the core slice, the mock handlers, and both apps' screens, all wired
up and all passing the gate. Then fill in the real fields.

**A new endpoint on an existing feature**, in `packages/core/src/features/<name>/`,
in this order:

1. `schemas.ts` — zod schema; derive types with `z.infer`, never hand-write a
   parallel `interface`
2. `api.ts` — the call, ending in `Schema.parse(response.data)`, wrapped in
   `try/catch` → `toApiError(error)`
3. `keys.ts` — add to the key factory; never inline a key array at a call site
4. `hooks.ts` — `useXQuery` / `useXMutation`
5. `packages/mocks/src/handlers/<name>.ts` — the mock, path written as
   `'*/api/...'` (the leading `*` is required; see the comment in that file)
6. a test in `__tests__/`

**Read the reference for the SHAPE you are building before writing anything.** Each
demonstrates its pattern exactly once — copy, do not invent:

| Building…                              | Read                                              |
| -------------------------------------- | ------------------------------------------------- |
| a paginated list + CRUD                | `packages/core/src/features/posts/`               |
| a search / filter box                  | `posts-list-page.tsx` + `useDebouncedValue`       |
| a settings-style form                  | `packages/core/src/features/profile/`             |
| cross-field or conditional validation  | `features/profile/schemas.ts` (`superRefine`)     |
| client state that is not server data   | `apps/*/stores/ui-store.ts`                       |
| a third-party widget on both platforms | `features/bug-reporter/` + `docs/bug-reporter.md` |

`docs/patterns.md` is the annotated tour of all of them.

**A new web page**: `apps/web/src/features/<area>/<name>-page.tsx`, registered in
`apps/web/src/router.tsx` (use `lazy` unless it is the first screen a user sees).

**A new mobile screen**: a file under `apps/mobile/app/`. It needs a **default
export**. Components that are not routes go in `apps/mobile/components/`.

**A new UI primitive**:

- web — refetch from the Tailwind-3 shadcn registry:
  `https://ui.shadcn.com/r/styles/new-york/<name>.json`, write it to
  `apps/web/src/components/ui/`, and rewrite `@/registry/new-york/ui/` →
  `@/components/ui/`. **Do not use the default `shadcn` CLI** — it emits Tailwind
  4 syntax this repo cannot build.
- mobile — hand-write it in `apps/mobile/components/ui/` following
  `button.tsx`: `cva` for variants, and `TextClassContext` if it wraps text.

<!-- END:recipes -->

<!-- BEGIN:commands -->

## Commands

```bash
make setup              # first time: checks tools, installs, generates CSS
pnpm dev:web            # web at :5173 — works with NO backend (MSW)
pnpm mock               # mock API at :4000 — required by the mobile app
pnpm dev:mobile         # Expo dev server (needs a dev build, not Expo Go)

pnpm quality:check      # the exact gate CI runs. Run before claiming done.
pnpm fix                # eslint --fix + prettier --write (run this after `gen`)
pnpm lint:fix           # eslint --fix only
pnpm test               # vitest (core, tokens, web)
pnpm test:mobile        # jest-expo
pnpm test:e2e           # Playwright against the built app (no backend needed)
pnpm test:e2e:dev       # Playwright against `vite dev` — boot smoke test, ~3s
pnpm gen feature        # scaffold a full vertical slice
pnpm tokens:sync        # regenerate global.css after editing tokens.ts
pnpm doctor             # duplicate deps + expo-doctor + expo install --check
```

Sign in with `anisha@example.com` / `password123`. Editing the post with id
`post-fail` always returns 500 — that is deliberate, to demonstrate the
optimistic-update rollback.

<!-- END:commands -->

<!-- BEGIN:definition-of-done -->

## Definition of done

`pnpm quality:check` passes, new logic has a test, user-facing strings go through
`t()`, no new `eslint-disable`, and the commit is Conventional.

If a shared hook or schema in `@repo/core` changed, **both apps** were updated in
the same change — that is the point of sharing logic.

If you cannot satisfy a rule, stop and explain why. Do not disable the rule, and
do not report success you have not verified.

<!-- END:definition-of-done -->
