---
mode: agent
description: Add one web page or one mobile screen, wired and verified
---

Add a screen: ${input:Platform and name (web|mobile <name> — e.g. web settings, mobile profile-edit)}

## Web screen

File: `apps/web/src/features/<area>/<name>-page.tsx`

- Named export: `export function <Name>Page()`
- Register with `lazy` in `apps/web/src/router.tsx` unless it is the first screen
  a user sees
- Data from a `@repo/core` hook only — never add a route `action`; mutations go
  through `useMutation` so the logic stays shared with mobile

## Mobile screen

File: `apps/mobile/app/<path>.tsx`

- **Default export** — expo-router uses the file path as the route
- Non-route components go in `apps/mobile/components/`, not `app/`
- Header options in the group's `_layout.tsx`, not per screen
- Styling is NativeWind `className` only — no `StyleSheet.create`

## Both platforms

Render the five states in this order, every time:

1. Loading skeleton
2. Error (with retry button)
3. Empty state (distinct message if a search is active)
4. Content
5. Load-more / pagination

Copy the structure from the matching screen in the `posts` feature so both
platforms stay recognisable.

All user-facing strings through `t()`. Finish with `pnpm quality:check`.
