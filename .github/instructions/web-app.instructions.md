---
applyTo: 'apps/web/src/**'
---

# Web app rules

## Stack

- React Router v8 (`react-router`, not `react-router-dom`)
- Tailwind CSS **v3** — no `@theme`, no `@import "tailwindcss"` (that is v4 syntax)
- TanStack Query v5 for all server data
- shadcn/ui components — fetched from registry, never from the CLI

## Do not

- Add a route `action` — mutations go through `useMutation`
- Let a route `loader` throw — see below
- Use `localStorage`/`sessionStorage` — tokens are memory-only
- Import anything from `react-router-dom`
- Use raw hex colours — tokens live in `@repo/tokens`
- Edit `apps/web/src/global.css` — it is generated from
  `packages/tokens/src/tokens.ts`; edit that (or `styles/extra.css`) and run
  `pnpm tokens:sync`
- Use shadcn's `FormLabel`/`FormDescription` outside a `<FormField>` — they call
  `useFormField()` and throw

## Route registration

```tsx
// router.tsx — lazy unless it is the first screen a user sees.
// Import with the `@/` alias, not a relative path.
{ path: '/settings', lazy: async () => ({ Component: (await import('@/features/settings/settings-page')).SettingsPage }) }
```

## Loaders are prefetch only, and MUST NOT throw

React Router runs a matched route's loader **regardless of what its parent
component would render**. So on an unauthenticated first visit the loader fires
before `<ProtectedLayout>` can redirect, gets a 401, and throws into
`errorElement` — the user sees "Something went wrong / Not authenticated." instead
of the login screen.

A prefetch that can break the page is worse than no prefetch. Guard on the token
and swallow failures; the component's own hook already renders a proper error state
with a retry:

```tsx
loader: async () => {
  if (!getAuthToken()) return null; // nothing to prefetch, and asking would 401
  await queryClient.ensureInfiniteQueryData(postsListOptions()).catch(() => null);
  return null;
},
```

If you are unsure whether to add a loader: don't. See the long comment in
`apps/web/src/router.tsx` — the Playwright demo-flow spec is what caught this.

## Page component

```tsx
// apps/web/src/features/<area>/<name>-page.tsx
export function SettingsPage() { ... }   // named export, never default
```

## shadcn/ui components

Fetch from the registry directly — the CLI emits Tailwind 4 syntax this repo cannot build:

```bash
curl https://ui.shadcn.com/r/styles/new-york/<name>.json | ...
```

Then rewrite `@/registry/new-york/ui/` → `@/components/ui/`.

## Five states — every list screen

Loading skeleton → error (with retry) → empty → items → load-more.
Copy from `apps/web/src/features/posts/`.
