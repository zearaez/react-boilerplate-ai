# Troubleshooting

Ordered by how often it happens. If none of this helps, check
[known-issues.md](known-issues.md) — it lists the upstream bugs already known.

## First resort

```bash
pnpm doctor     # duplicate deps + expo-doctor + expo install --check
```

Most "impossible" behaviour in a monorepo is a duplicate dependency, and this names
it.

## "Invalid hook call" / "No QueryClient set"

Two copies of `react` or `@tanstack/react-query`. `@repo/core` exports hooks, so
React genuinely crosses the package boundary.

```bash
node scripts/assert-single-version.mjs
```

Fix by correcting the pin in the `overrides` block of `pnpm-workspace.yaml` — not
`package.json`, which pnpm 11 ignores — then reinstall.

## Mobile: styles are not applying at all

The scariest failure here is silent: every `className` becomes a no-op with no
error. Check in this order:

1. `apps/mobile/babel.config.js` still has `jsxImportSource: 'nativewind'` **and**
   the `'nativewind/babel'` preset.
2. `react-native-worklets/plugin` is still **last** in the plugin list.
3. `metro.config.js` still wraps with `withNativeWind(config, { input: './global.css' })`.
4. `app/_layout.tsx` still imports `'../global.css'`.
5. `npx expo start --clear` — the transform is cached.

To confirm from the built bundle rather than by eye:

```bash
pnpm --filter @repo/mobile exec expo export --platform ios --output-dir dist
node scripts/assert-native-styles.mjs apps/mobile/dist
```

## Web: styles worked in dev and vanished in the build

Real failure mode, twice over — Tailwind purging and Rolldown tree-shaking. Never
trust `vite dev` for this:

```bash
pnpm --filter @repo/web build
node scripts/assert-css-output.mjs apps/web/dist
```

If the dark palette specifically is missing, something moved the token block back
inside `@layer base`. See known-issues.

## Metro: cannot resolve a module

```bash
pnpm install && pnpm --filter @repo/mobile exec expo start --clear
```

**Do not** add `watchFolders`, `resolver.nodeModulesPaths` or `extraNodeModules` to
`metro.config.js`. Expo has auto-detected monorepos since SDK 52, and adding those
_overrides_ that detection and breaks pnpm resolution. Every snippet online telling
you to add them is SDK 51-era advice.

## Mobile cannot reach the mock API

`pnpm mock` must be running, in a separate terminal, before `pnpm dev:mobile`.

On a **physical device**, `localhost` means the device. `lib/api-url.ts` reads the
LAN address out of the Expo dev-server host, so this normally just works — but the
phone and the laptop must be on the same network, and macOS may prompt for local
network permission the first time.

Check the server directly: `curl http://localhost:4000/health`.

## Mocks work on web but 404 on device

The handler path is missing its leading `*`. The browser worker matches absolute
URLs; `@mswjs/http-middleware` matches bare paths. `'*/api/posts'` satisfies both;
`'/api/posts'` does not.

## TypeScript errors that are not real

Restart the TS server (VS Code: _TypeScript: Restart TS Server_). Editors cache
across `pnpm install`, and `.expo/types` is generated.

If `tsc` disagrees with your editor, `tsc` is right — the editor may be using its
bundled TypeScript rather than the pinned 6.0.3.

## `pnpm install` did not install anything

You are probably in a subdirectory. Workspace commands run from the repo root, or
use `pnpm --filter <pkg>`.

## Lint complains about import order on code I did not write

Run `pnpm fix` — `lint:fix` alone is not enough, because Prettier is a separate step
from ESLint in this repo. This is expected after `pnpm gen feature`: appended imports
land next to their anchor and have to be re-sorted, which no fixed anchor position can
avoid.

## Everything is broken after switching branches

```bash
make reset      # removes node_modules and reinstalls from the lockfile
```
