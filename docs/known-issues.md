# Known issues

Upstream bugs and rough edges this repo works around. Each has a reason and a
"delete this when" so the workaround does not outlive the bug.

## NativeWind

**`nativewind/preset` ships an empty type declaration.** `dist/tailwind/index.d.ts`
is a 0-byte file and there is no `exports` entry for `./preset`, so
`import nativewindPreset from 'nativewind/preset'` errors with "File … is not a
module". Worked around by declaring the module in
`apps/mobile/types/nativewind-preset.d.ts`.
_Delete when_ NativeWind ships types for the preset.

**Two pnpm bugs, masked by `nodeLinker: hoisted`.**

- [PR #1771](https://github.com/nativewind/nativewind/pull/1771) (open): NativeWind
  resolves `tailwindcss` from its own nested `node_modules`, producing bogus
  "unsupported Tailwind version" errors.
- [#1833](https://github.com/nativewind/nativewind/issues/1833) (open):
  `react-native-css-interop/babel` requires `@babel/plugin-transform-react-jsx` by
  name without depending on it.

Hoisting makes both disappear because there is one copy on disk. We also declare
`@babel/plugin-transform-react-jsx` explicitly. The cost of hoisting is phantom
dependencies, which is why `import-x/no-extraneous-dependencies` is an error.
_Revisit if_ you ever need pnpm's strict layout.

**LogBox renders wrong on RN 0.86** —
[#1834](https://github.com/nativewind/nativewind/issues/1834), fix PR #1840 open.
RN 0.86 gave `LogBoxButton` a function-valued `style`, which the interop does not
handle. **Dev-only**; production styling is unaffected. Not worked around, because
the only workaround is dropping `nativewind/babel`, which disables all styling.

## Tailwind

**`.dark` was purged from the production CSS.** Inside `@layer base`, Tailwind
treats `.dark { … }` as a candidate rule and removes it when no `dark` class and no
`dark:` variant appear in the content globs — which is true of a fresh app. The
entire dark palette silently vanished from the build while dev looked fine.

Fixed by emitting the custom properties **outside** `@layer` in
`packages/tokens/src/render.ts`, and asserted by
[`scripts/assert-css-output.mjs`](../scripts/assert-css-output.mjs) so it cannot
regress unnoticed.

## shadcn/ui

**The default CLI emits Tailwind 4.** `npx shadcn@latest` would install
`tailwindcss@4`, rewrite the CSS to `@theme`, and break both apps. Components are
instead fetched from the Tailwind-3 registry path
`https://ui.shadcn.com/r/styles/new-york/<name>.json` and written into
`apps/web/src/components/ui/`, rewriting `@/registry/new-york/ui/` →
`@/components/ui/`. Recipe in AGENTS.md.

**`sonner` is not vendored** — its shadcn wrapper depends on `next-themes`, which is
Next-specific. The demo has no toasts.

## Expo / EAS

**`expo-doctor` is not a local bin in SDK 57.** It is a separate package, so it runs
via `pnpm dlx expo-doctor@latest`. The `doctor` script does this.

**EAS + pnpm is a known rough edge** — eas-cli
[#3148](https://github.com/expo/eas-cli/issues/3148),
[#2978](https://github.com/expo/eas-cli/issues/2978),
[#2541](https://github.com/expo/eas-cli/issues/2541). Build workers read
`packageManager` and provision pnpm through Corepack; a version skew fails the
install. `eas.json` sets `corepack: true` and `NPM_CONFIG_NODE_LINKER=hoisted`. **If
a build fails at the install step**, set `corepack: false` and add
`"pnpm": "11.18.0"` to the build profile.

This is also why EAS is not in the PR gate — an intermittently failing _required_
check destroys trust in every other gate.

**Expo Go cannot run SDK 57 on a physical device.** Use a dev build
(`pnpm dev:mobile` passes `--dev-client`). Also note `create-expo-app` still
scaffolds SDK 54 by default; this repo was set up for 57 explicitly.

**`jest-expo@57` peer-depends on `@react-native/jest-preset ^0.86.2`** against RN
0.86 ([expo/expo#47435](https://github.com/expo/expo/issues/47435)). Handled by an
`overrides` entry.

## Testing

**RNTL 14 made `render` async.** `render`, `fireEvent`, `renderHook` and `act` all
return promises now, so they must be awaited — an un-awaited `render` is a floating
promise that lint catches, and silencing it lets assertions race the mount. Every
RNTL 13-era snippet online omits the await.

**`jest-expo`'s `transformIgnorePatterns` must be extended, not replaced.** It ships
one negative-lookahead pattern listing every package to transform; you cannot add a
pattern to un-ignore something, because a file is ignored if _any_ pattern matches.
`apps/mobile/jest.config.js` injects our workspace packages into that lookahead.
The same file spreads the preset's `moduleNameMapper` rather than replacing it,
which would otherwise break every asset import.

**axe cannot check colour contrast in jsdom** (no canvas), so the rule is disabled
explicitly in the web a11y test rather than silently skipped. Contrast is covered
instead by the token-level WCAG test in `@repo/tokens`.

## Traps in this repo's own design

These are not upstream bugs — they are mistakes that were made here, found by the
Playwright suite, and fixed. They are documented because they are easy to
reintroduce.

**A route loader runs even when the parent guard would redirect.** React Router runs
a matched route's loader regardless of what its parent component renders. The index
route's prefetch loader therefore fired on an unauthenticated first visit, got a 401,
and threw into `errorElement` — so a new visitor saw "Something went wrong / Not
authenticated." instead of the login screen. The loader in
`apps/web/src/router.tsx` now returns early without a token **and** swallows
failures: a prefetch that can break the page is worse than no prefetch.

**The app entry must call `hydrate()`.** The auth store starts at status `'idle'`,
which `<ProtectedLayout>` treats as "still loading". `main.tsx` originally never
hydrated, so the web app rendered a loading state forever and never redirected.
Mobile did it correctly in `app/_layout.tsx`. Unit tests could not catch it because
they sign in directly; `apps/web/src/components/__tests__/protected-layout.test.tsx`
now covers the store transitions explicitly.

**Duplicate `Stack.Screen` entries crash expo-router**, with
`Screen names must be unique: …`. It is a hard render error, not a warning, so a
stale or repeated entry in `app/(app)/_layout.tsx` takes the whole app down. Worth
knowing because the `@gen:screens` anchor makes appending there easy.

**`page.goto()` signs you out in E2E.** Web tokens are memory-only by design, so any
full page load ends the session. Navigate by clicking once signed in, or the test
silently asserts against the login screen.

**Nothing tested `vite dev`.** Every gate ran against the production build —
`vite build` for the bundle assertions, `vite preview` for Playwright, Node for
Vitest — so the environment developers actually use all day had no check on it at
all. A dev-only breakage could have shipped with CI fully green. `pnpm test:e2e:dev`
(`apps/web/e2e-dev/`, its own Playwright config against `vite dev`) closes that:
three specs, ~3 seconds, asserting the app boots with no uncaught errors, that no
Node-only global leaks into the browser, and that logger output reaches the console.

**`@repo/core` must not read `process.env`.** Vite's `define` does replace
`process.env.NODE_ENV` in dev — including the bracket form that strict
index-signature rules push you into writing — so a read there appears to work. It is
still wrong: `@repo/core` also runs on Hermes and under Vitest, and it should not
depend on any one bundler's `define` behaviour to be correct. The app passes its
environment in through `configureLogger()` / `configureCore()`, and `process` is in
`no-restricted-globals` for the package.

**shadcn's `CardTitle` renders a `<div>`, not a heading.** Using it as a page title
leaves the page with no `<h1>`, which screen-reader users navigate by. axe's
`wcag2a`/`wcag2aa` tags do not flag it — the rule is `page-has-heading-one` under
`best-practice`, which is why that tag is now included in the web a11y test.

## Tooling

**pnpm 11 moved two settings.** `overrides` and `allowBuilds` live in
`pnpm-workspace.yaml`; `pnpm.overrides` in `package.json` is ignored with only a
warning.

**`turbo gen` hangs if you spawn a package manager from inside a generator action.**
The feature generator therefore does not run `eslint --fix` itself; it tells you to
run `pnpm lint:fix`, which is a required step because appended imports need
re-sorting. See the note at the top of `turbo/generators/config.ts`.

**React Native's types redeclare `process.env` with an `any` index signature**,
overriding `@types/node`. Every bare `process.env.FOO` is therefore an `any` that
the `no-unsafe-*` rules reject. Use `readEnv()` from `apps/mobile/lib/env.ts`.
