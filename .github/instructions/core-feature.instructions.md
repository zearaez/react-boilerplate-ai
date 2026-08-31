---
applyTo: 'packages/core/src/features/**'
---

# Core feature slice rules

You are editing a `@repo/core` feature. This package is **platform-agnostic** —
it has no JSX, no `react-native`, no `expo-*`, no `react-dom`, no `@repo/tokens`,
no `window`/`document`. The linter enforces this; do not add `eslint-disable`.

## File order within a feature

1. `schemas.ts` — zod schemas; types derived with `z.infer`; never hand-write an interface
2. `api.ts` — one function per endpoint; call → `Schema.parse(response.data)` → `toApiError(error)`
3. `keys.ts` — query key factory; never inline a key array at a call site
4. `hooks.ts` — TanStack Query hooks
5. `index.ts` — barrel export

## zod (v4) syntax

```ts
// v4 — not .string().email()
z.email();
z.iso.datetime();
z.infer<typeof mySchema>;
```

## TanStack Query (v5) syntax

```ts
// object syntax only — no positional overloads
useQuery({ queryKey: xKeys.detail(id), queryFn: () => getX(id) });
useMutation({
  mutationFn: createX,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: xKeys.lists() }),
});
```

`staleTime` and `gcTime` are set once, in `packages/core/src/query/client.ts`
(`DEFAULT_STALE_TIME_MS` / `DEFAULT_GC_TIME_MS`) — do **not** repeat them on every
hook. Override on a single hook only when that resource genuinely differs, and say
why in a comment: `profileOptions` uses 300_000 because a profile changes rarely
and is read on several screens.

Prefer `queryOptions` / `infiniteQueryOptions` over a bare `useQuery` config when a
route loader also needs to prefetch it — sharing the one object is what guarantees
the prefetch lands in the same cache entry the component subscribes to.

## Cross-field validation

Use `superRefine` with a `path`, never `.refine()` for field-specific rules:

```ts
.superRefine((val, ctx) => {
  if (condition) ctx.addIssue({ code: 'custom', path: ['fieldName'], message: '...' });
})
```
