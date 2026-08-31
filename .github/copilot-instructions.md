# GitHub Copilot — project instructions

> Your training data is wrong about every pinned version below. Read the linked
> docs before writing code, not after. If a URL 404s, say so and stop.

## Pinned versions — do not use remembered APIs

| Library        | Version    | Docs URL                                                                      |
| -------------- | ---------- | ----------------------------------------------------------------------------- |
| Expo / SDK     | 57         | https://docs.expo.dev/versions/v57.0.0/                                       |
| expo-router    | ~57.0.9    | https://docs.expo.dev/router/advanced/protected/                              |
| NativeWind     | 4.2.6      | https://www.nativewind.dev/docs/getting-started/installation                  |
| Tailwind CSS   | **3.4.19** | https://v3.tailwindcss.com/docs ← v4 docs are wrong here                      |
| React Router   | 8.3.0      | https://reactrouter.com/ (`react-router`, not `react-router-dom`)             |
| Vite           | 8.2.0      | https://vite.dev/guide/ (Rolldown: `rolldownOptions`, not Rollup)             |
| Vitest         | 4.1.10     | https://vitest.dev/guide/migration (`projects`, not `workspace`)              |
| ESLint         | 10.8.0     | https://eslint.org/docs/latest — flat config only, no `.eslintrc`             |
| TypeScript     | **6.0.3**  | https://www.typescriptlang.org/docs/ — do NOT suggest upgrade                 |
| TanStack Query | 5.101.4    | https://tanstack.com/query/latest — object syntax, `gcTime` not `cacheTime`   |
| zod            | 4.4.3      | https://zod.dev/ — `z.email()`, `z.iso.datetime()`, not `.string().email()`   |
| RNTL           | 14.0.1     | https://callstack.github.io/react-native-testing-library/ — `render` is async |
| Jest (mobile)  | **29.7.0** | https://jestjs.io/docs/29.x — jest-expo@57 needs Jest 29, not 30              |

## Where code goes

| Building…                                               | Goes in                              |
| ------------------------------------------------------- | ------------------------------------ |
| API call, zod schema, query hook, query key, auth store | `packages/core/src/features/<name>/` |
| Colour, radius                                          | `packages/tokens/src/tokens.ts`      |
| Mock endpoint or fixture                                | `packages/mocks/src/`                |
| Web page or component                                   | `apps/web/src/`                      |
| Mobile screen (a route)                                 | `apps/mobile/app/`                   |
| Mobile component (not a route)                          | `apps/mobile/components/`            |
| Lint or tsconfig change                                 | `packages/config/`                   |

`@repo/core` is platform-agnostic — **never** import `react-native`, `expo-*`,
`react-dom`, `@repo/tokens`, or touch `window`/`document` from it.

## Hard rules (CI enforces every one)

- No `any` — use `unknown` + zod parse, or write the type
- No `console.*` — use `logger` from `@repo/core`
- No raw colours (`#fff`, `rgb()`) — add a token to `@repo/tokens` first
- No `localStorage`/`sessionStorage` — tokens are memory-only on web
- No `StyleSheet.create` in mobile — use NativeWind `className`
- Every user-facing string goes through `t()`
- Every API response is `zod.parse`d before leaving the api layer
- No import cycles; no undeclared dependencies
- Imports ordered, blank line between groups — run `pnpm lint:fix` to autofix

## Patterns — always copy these, never invent a new shape

**A new feature slice** (in `packages/core/src/features/<name>/`), in order:

1. `schemas.ts` — zod schema; derive types with `z.infer`, never hand-write a type
2. `api.ts` — call → `Schema.parse(response.data)` → `toApiError(error)`
3. `keys.ts` — key factory; never inline a key array at a call site
4. `hooks.ts` — `useXQuery` / `useXMutation`
5. `packages/mocks/src/handlers/<name>.ts` — path written as `'*/api/...'`
6. `__tests__/` — a test

**Use the generator instead of hand-writing:**

```bash
pnpm gen feature --args <singular> <plural> /api/<plural>
pnpm fix   # required: sorts imports AND formats
```

**Reference implementations to copy from:**

- Paginated list + CRUD → `packages/core/src/features/posts/`
- Single-resource form + cross-field validation → `packages/core/src/features/profile/`
- Client-only UI state → `apps/*/stores/ui-store.ts`

## TanStack Query conventions

```ts
// Always use the key factory — never inline an array
const query = useQuery({ queryKey: postKeys.detail(id), queryFn: () => getPost(id) });

// A query a route loader also prefetches is declared as a shared options object,
// so the prefetch and the component hit the same cache entry. Real signature:
export function postsListOptions(params: PostListParamsInput = {}) {
  const parsed = postListParamsSchema.parse(params);
  return infiniteQueryOptions({ queryKey: postKeys.list(parsed), queryFn: /* … */ });
}

// Mutations: invalidate+refetch by default; optimistic only when justified
// Reference: useUpdatePost in packages/core/src/features/posts/hooks.ts
```

`staleTime` and `gcTime` live in one place — `packages/core/src/query/client.ts`
(`DEFAULT_STALE_TIME_MS` / `DEFAULT_GC_TIME_MS`). Do **not** set them on every
hook. Override on one hook only when that resource genuinely differs, and comment
why (`profileOptions` uses 300_000; `postsListOptions` uses 120_000).

## Every list screen renders five states, in this order

Loading skeleton → error (with retry) → empty → items → load-more  
Both platforms, every feature. Copy from the posts screens.

## Never do these

- `npm install` or `yarn` — use `pnpm add --filter <pkg> <dep>`
- Hardcode a version in `package.json` — use `catalog:` from `pnpm-workspace.yaml`
- Import `@react-navigation/*` — expo-router forked away in SDK 56
- Import `react-router-dom` — it does not exist at v8
- Write Tailwind v4 syntax (`@theme`, `@import "tailwindcss"`, CSS-first config)
- Upgrade `typescript` past 6.0.3, `tailwindcss` past 3, `nativewind` past 4, `jest` past 29
- Add a route `action` in the web router — mutations go through `useMutation`
- Put UI state in `@repo/core`, or server data in a Zustand store
- Use `shadcn` CLI — it emits Tailwind 4 syntax; fetch from the registry directly
- Add `useMemo`/`useCallback`/`React.memo` without a measurement
- Add an `eslint-disable`, widen a type to `any`, or lower a coverage threshold
- Commit to `main`/`prod`/`uat`/`develop`, or use `--no-verify`

## Commands

```bash
pnpm quality:check    # the exact gate CI runs — run before claiming done
pnpm fix              # eslint --fix + prettier --write (run after gen)
pnpm gen feature      # scaffold a full vertical slice
pnpm tokens:sync      # regenerate global.css after editing tokens.ts
pnpm dev:web          # web at :5173 (works with NO backend — MSW)
pnpm mock             # mock API at :4000 (required by mobile)
pnpm test             # vitest (core, tokens, web)
pnpm test:mobile      # jest-expo
```

Sign in with `anisha@example.com` / `password123`.
