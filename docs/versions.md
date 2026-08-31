# Versions: what is pinned, and why

Every version lives in the catalog in [`pnpm-workspace.yaml`](../pnpm-workspace.yaml).
Package manifests say `catalog:`, never a number.

**Read this before upgrading anything.** Six of these pins are deliberately behind
npm `latest`, and in every case `latest` is actively broken here — not merely
untested. Dependabot is configured to leave them alone.

---

## The six traps

### `typescript` — 6.0.3 exact, not 7.x

TypeScript 7 (the Go port) ships **no compiler API**: its `"."` export is a version
stub, and there is no `tsserver` bin. `@typescript-eslint/typescript-estree` does
`import * as ts from 'typescript'` and calls `ts.createProgram`, so against TS 7 it
does not degrade — it fails outright.

No typescript-eslint release supports TS 7, including the canary: the peer range is
`typescript: >=4.8.4 <6.1.0` on both. The blocking work is not just TS 7.1's new
API, it also needs async parser support in ESLint core.

The pin is **exact, not `^6.0.0`**, because 6.1.0 would fall outside that peer
range and silently disable every type-aware rule — `no-floating-promises`,
`no-misused-promises`, `await-thenable`, `no-unnecessary-condition`. Those are the
highest-value rules in the config for agent-written async code.

Revisit only when a typescript-eslint release raises the cap.

### `tailwindcss` — 3.4.19 exact, not 4.x

NativeWind 4 is a Tailwind **3** tool. Its declared peer range is `>3.3.0`, which
looks permissive but is a known upstream bug (nativewind#1423, closed without the
range being tightened): Tailwind 4 installs happily and then nothing compiles —
no classes, no error. NativeWind's engine drives Tailwind through the v3
`loadConfig` API, which v4 removed.

NativeWind 5 is the Tailwind-4 line, and it is not ready: still `5.0.0-preview.4`,
no RC, and its **web** target has an open unanswered crash. Both apps stay on
Tailwind 3 so there is one Tailwind mental model in the repo — a mixed-major
workspace is how agents end up writing `@theme` into a v3 config.

Tailwind 4 and NativeWind 5 must move together, by hand, in one change.

### `jest` — 29.7.0, not 30.x (mobile only)

`jest-expo@57.0.3` depends on Jest **29** internals (`@jest/globals ^29.2.1`,
`babel-jest ^29.2.1`, `jest-snapshot ^29.2.1`). Pairing it with a v30 runtime fails
at suite start with:

```
TypeError: this._moduleMocker.clearMocksOnScope is not a function
```

which reads like a config problem and is not one. Vitest 4 handles everything
outside `apps/mobile`, so this pin is contained.

### `@babel/core` — 7.29.7, not 8.x

Babel 8 changed `loadPartialConfig` to require a callback. `babel-jest` calls it
synchronously, so every mobile test fails with:

```
Starting from Babel 8.0.0, the 'loadPartialConfig' function expects a callback.
```

The whole React Native / Expo toolchain is on Babel 7.

### `@sentry/react-native` — ~7.11.0, not 8.x

Expo SDK 57 pins the 7.x line in its `bundledNativeModules.json`. npm `latest` is
8.x and is not compatible with this SDK. (The **web** app uses `@sentry/react` 10,
which is unrelated and fine.)

### `react-native-gesture-handler` — ~2.32.0, not 3.x

RNGH 3 is a New-Architecture rewrite that SDK 57 has not adopted. Installing 3.x
fails `expo-doctor`.

---

## `react` — 19.2.3 exact, forced repo-wide

npm `latest` is 19.2.8; Expo SDK 57 pins **19.2.3 exactly**. We align _down_.

This matters more than a patch delta suggests. `@repo/core` exports React hooks, so
React genuinely crosses the package boundary — and with `nodeLinker: hoisted`, a
version split produces:

```
Invalid hook call. Hooks can only be called inside the body of a function component.
```

with a stack trace pointing into `@tanstack/react-query`. That is hours for a human
and effectively unsolvable for an agent. Deviating from Expo's pin also fails
`expo-doctor`, so mobile would pay a real cost while web pays nothing.

Forced via `overrides` in `pnpm-workspace.yaml`, alongside `react-dom`,
`@tanstack/react-query` (two copies → "No QueryClient set") and `tailwindcss`.
Guarded by [`scripts/assert-single-version.mjs`](../scripts/assert-single-version.mjs)
in CI.

## Expo packages — Expo owns these

In SDK 57 Expo unified module versions with the SDK number: `expo-constants` is
`~57.0.8`, not `~18.x`. Any `~1x.x` version you remember for an `expo-*` package is
stale.

Never bump them by hand:

```bash
pnpm --filter @repo/mobile exec expo install --check
```

## Where `overrides` lives

**`pnpm-workspace.yaml`, not `package.json`.** pnpm 11 stopped reading
`pnpm.overrides` from `package.json` and ignores it with only a warning — so a
config carried over from pnpm 9 silently ships two copies of React.

## Things that are current, and deliberately so

| Package        | Version | Note                                                                                                                                            |
| -------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `vite`         | 8.2.0   | Rolldown + Oxc, no opt-out. `build.rolldownOptions`, `oxc` not `esbuild`, and `resolve.tsconfigPaths` is built in — drop `vite-tsconfig-paths`. |
| `react-router` | 8.3.0   | ESM-only, Node ≥ 22.22. **`react-router-dom` does not exist at v8** (frozen at 7.18.2) — installing it gives a silently stale router.           |
| `vitest`       | 4.1.10  | `projects` replaced `workspace`; the default `exclude` shrank; **`coverage.include` must be explicit** or thresholds pass trivially.            |
| `eslint`       | 10.8.0  | Flat config only. Config now resolves from each linted file's directory upward, which is why per-package configs work.                          |
| `zod`          | 4.4.3   | Top-level `z.email()` / `z.iso.datetime()`; the `z.string().email()` forms are deprecated.                                                      |
| `expo`         | 57.0.9  | Legacy architecture was removed in SDK 55, so `newArchEnabled` is obsolete — it is not even valid in the config schema.                         |

## Not enabled: React Compiler

`babel-plugin-react-compiler` is stable at 1.0.0, and the correctness half is
already on — `eslint-plugin-react-hooks` 7 ships the compiler's lint rules and they
run on both apps.

The compiler itself is off. It would mean a Babel pass through Rolldown
(`@rolldown/plugin-babel`), which is the newest and least-proven integration in
this stack, for an optimisation this template does not need. Enabling it later is
two lines in `apps/web/vite.config.ts` plus `experiments.reactCompiler` in
`app.config.ts`.
