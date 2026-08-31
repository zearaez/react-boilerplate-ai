# Patterns — a tour of the demo slice

These features exist to be copied. Between them they demonstrate every pattern in
the repo **exactly once**, so there is one right answer to look up rather than three
variations to choose between.

| Reference      | Archetype it covers                                                       |
| -------------- | ------------------------------------------------------------------------- |
| `auth`         | session, route guards, the 401 path                                       |
| `posts`        | **paginated list CRUD** — the common case                                 |
| `posts` search | **filtering a list**: debounce + keepPreviousData + two empty states      |
| `profile`      | **single-resource form**: no list, cross-field and conditional validation |
| `ui-store`     | **app-local client state**, and where the boundary with core sits         |

Start with `packages/core/src/features/posts/`. If what you are building is a form
rather than a list, read `features/profile/` too — it is deliberately structured
differently.

## The unit of work

A feature is five files in `packages/core/src/features/<name>/`, always in this
order:

| File         | Holds                                     |
| ------------ | ----------------------------------------- |
| `schemas.ts` | zod schemas; types derived with `z.infer` |
| `api.ts`     | one function per endpoint                 |
| `keys.ts`    | the query-key factory                     |
| `hooks.ts`   | the TanStack Query hooks                  |
| `index.ts`   | the barrel                                |

Then a mock handler in `packages/mocks`, then the screens in each app.
`pnpm gen feature` writes all of it.

## 1. zod is the single source of truth

`schemas.ts` produces the TypeScript type, validates the form, **and** parses the
API response. Never hand-write an `interface` beside a schema — derive it:

```ts
export const postSchema = z.object({ id: z.string(), title: z.string() });
export type Post = z.infer<typeof postSchema>;
```

`createPostInputSchema` is used by `zodResolver` in **both** apps' forms and by
`api.ts` for the request body. That is why two hand-written forms cannot disagree
about what is valid, or about the wording of an error.

## 2. Every api function: call, parse, normalise

```ts
export async function getPost(id: string): Promise<Post> {
  try {
    const response = await getApiClient().get(`/api/posts/${id}`);
    return postSchema.parse(response.data); // never `as`
  } catch (error) {
    throw toApiError(error);
  }
}
```

The parse is not ceremony. It turns "the backend renamed a field" from a mystery
crash three screens later into a clear error at the boundary.

`toApiError` gives every failure one shape with a `kind`, so UI switches on
`error.kind` rather than string-matching a message. And because
`packages/core/src/query/client.ts` registers `ApiError` as TanStack Query's
default error type, `query.error.kind` type-checks everywhere without a cast.

Note the distinction `parseRequestBody` draws: bad **input** is
`kind: 'validation'` with per-field messages a form can render; a bad **response**
is `kind: 'schema'`, which is a bug report. Collapsing them would show "the API
returned data this app does not understand" to someone who typed a short title.

## 3. Query keys are a factory, never a literal

```ts
export const postKeys = {
  all: ['posts'] as const,
  lists: () => [...postKeys.all, 'list'] as const,
  list: (p: PostListParams) => [...postKeys.lists(), p] as const,
  details: () => [...postKeys.all, 'detail'] as const,
  detail: (id: string) => [...postKeys.detail(), id] as const,
};
```

The nesting is the point: invalidating `lists()` leaves individual details cached.
An inlined key array typo'd in one place splits the cache and produces "why didn't
my list refresh", which is invisible in review.

## 4. One list hook: `useInfiniteQuery`

Web renders a "Load more" button; native uses `FlatList onEndReached`. A second
page-based hook over the same data would be the first thing to drift.

`postsListOptions()` is exported separately from the hook so a React Router loader
can prefetch with `ensureInfiniteQueryData` using the _same_ options object the
component subscribes to — sharing the object is what makes the prefetch actually
land in the cache the component reads.

## 5. Optimistic update with rollback

`useUpdatePost` is the reference. The four callbacks are not decoration:

- `onMutate` — **cancel in-flight refetches**, snapshot, apply the guess
- `onError` — restore the snapshot
- `onSuccess` — accept the server's authoritative version
- `onSettled` — invalidate, so anything derived recomputes

Skipping `cancelQueries` is the classic bug: an in-flight GET resolves after your
optimistic write and silently reverts the UI.

**Try it.** Edit the post with id `post-fail` — the mock always returns 500 for it.
You see the change apply instantly and then snap back. A rollback path nobody can
trigger is a rollback path nobody knows is broken.

## 6. Platform differences go through `configureCore()`

Two members: `apiUrl` and `storage`. Both are async, even on web, so core has one
code path.

There is deliberately **no** `onUnauthorized` injection. The 401 interceptor calls
`useAuthStore.signOut()`; web's `<ProtectedLayout>` and native's
`<Stack.Protected>` both already react to that store. Neither platform injects a
navigator.

The one honest asymmetry is `apps/mobile/lib/query-platform.ts`: TanStack Query's
focus tracking listens for a DOM event that does not exist on React Native, so
mobile wires `AppState` → `focusManager`. Web needs no equivalent. That is
documented rather than hidden behind an abstraction pretending the platforms are
the same.

## 7. Auth store hydration is explicit

`useAuthStore.hydrate()` is called once from the app root — **not** zustand's
`persist` middleware. `persist` reads storage when the store is _created_, which is
module-evaluation time, making correctness depend on whether `configureCore()`
happened to run first. That failure is nondeterministic and import-order dependent:
the worst kind to debug. Fifteen explicit lines beat an idiomatic race.

## 8. Every list screen renders five states, in order

Loading skeleton → error (with retry) → empty → items → load-more. Both platforms,
every feature. An agent reading one file should recognise the other.

## 9. Filtering a list (see: posts search)

Three parts, and all three are needed. Getting one wrong is the usual cause of a
search box that feels broken:

1. **The raw term lives in app state**, and the input is bound to _it_, so typing is
   instant. Binding the input to the debounced value is the classic mistake — the
   field lags by the debounce interval and feels stuck.
2. **`useDebouncedValue`** (from `@repo/core`) is what the query sees, so "post"
   is one request, not four. Each keystroke inside the window cancels the pending
   timer.
3. **`placeholderData: keepPreviousData`** in `postsListOptions` keeps the previous
   results on screen while the new term loads, and `isPlaceholderData` lets the UI
   dim them rather than blanking the whole region.

Plus one UX detail worth copying: **"no results" and "no posts yet" are different
messages.** `usePostsQuery` returns `isSearching` so both platforms decide it the
same way. Telling someone to "create the first post" when they mistyped a search is
the kind of small wrongness that makes an app feel careless.

## 10. A single-resource form (see: profile)

Structurally unlike the posts pages, and the right reference for anything
settings-shaped:

- **No list, no route param** — the resource is implicit, so the key factory is just
  `all` + `current()`.
- **The form is populated from a query**, which means it must be `reset()` once the
  data lands. `defaultValues` is captured on first render, when the query is still
  pending, so without the effect the form stays empty on a cold load.
- **The optimistic update is simpler than the list case**: one cache entry, no
  sibling lists to invalidate. Both versions exist on purpose — compare
  `useUpdateProfile` with `useUpdatePost`.
- **Save is disabled until `formState.isDirty`**, which is only meaningful because
  `reset()` clears dirty state.

### Cross-field validation

Use **`superRefine`, not `.refine()`**, whenever the rule concerns a particular
field. `superRefine` can attach the issue to a `path`; a bare `.refine()` puts it at
the form root, where react-hook-form cannot render it next to the input the user has
to fix — and an error you cannot locate is barely better than no error.

```ts
.superRefine((value, ctx) => {
  if (value.notificationChannel === 'sms' && value.phone.length === 0) {
    ctx.addIssue({ code: 'custom', path: ['phone'], message: '…' });
  }
});
```

The rule: **if a constraint can be expressed in the schema, it belongs in the
schema.** Both platforms get it, the api layer enforces it before the network, and
the message lands on the right field. Checking it in the component instead is how the
UI and the schema end up disagreeing.

### Conditional fields

The _predicate_ lives in core (`isPhoneRelevant`), not in each screen. Web renders a
`<select>` and mobile renders a row of Pressables — they should differ in markup but
never in **when** a field is relevant.

## 11. Where client state goes (see: ui-store)

`useAuthStore` is in `@repo/core` because both apps need the same session with the
same semantics. `apps/*/stores/ui-store.ts` is app-local because it describes how
that UI is arranged, and the two platforms have no reason to agree.

The decision, in order:

| Question                           | Answer                               |
| ---------------------------------- | ------------------------------------ |
| Does the server own it?            | Not a store at all — TanStack Query. |
| Do both apps need identical rules? | A store in `@repo/core`.             |
| Is it about this UI's arrangement? | `apps/*/stores/`.                    |
| Does only one screen care?         | `useState` in that screen.           |

That last row matters most. The posts search term is in a store **only** because it
has to survive navigating to a post and back. A value one screen owns stays in
`useState`; promoting it would make it global for no reason.

Note there is no `persist` middleware, for the same reason the auth store hydrates
explicitly — see §7.

---

## Deliberately not shown

So you know these are absent by choice, not oversight: tabs navigation, a dark-mode
toggle, data tables, file upload, pull-to-refresh, offline persistence and mutation
queueing, websockets, refresh-token rotation, deep links beyond `[id]`, push
notifications, and multi-step wizards.

Add them when a project needs them — and when you do, add them **once**, in the
place this guide would predict.
