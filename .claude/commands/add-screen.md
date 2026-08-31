---
description: Add one web page or one mobile screen, wired correctly
argument-hint: web|mobile <name>
---

Add a screen: $ARGUMENTS

**Web** — `apps/web/src/features/<area>/<name>-page.tsx`:

- Export a named component, e.g. `export function SettingsPage()`.
- Register it in `apps/web/src/router.tsx`. Use `lazy: async () => ({ Component: ... })`
  unless it is the first screen a user sees.
- Data comes from a `@repo/core` hook. **Never** add a route `action` — mutations
  go through `useMutation` so the logic stays shared with mobile.

**Mobile** — a file under `apps/mobile/app/`:

- It must have a **default export**; expo-router uses the file path as the route.
- Anything that is not a route belongs in `apps/mobile/components/`, not `app/`.
- Header options go in the group's `_layout.tsx`, not per screen.
- Styling is NativeWind `className`. No `StyleSheet.create`.

Either way, render the same five states in the same order as every other screen —
loading skeleton, error, empty, content, load-more — and copy the structure from
the counterpart file so the two platforms stay recognisable. Strings go through
`t()`.

Finish with `pnpm quality:check`.
