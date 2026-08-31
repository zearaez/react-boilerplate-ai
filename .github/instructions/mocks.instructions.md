---
applyTo: 'packages/mocks/src/**'
---

# Mock handler rules

## Handler path format

Handler paths **must** start with `*/api/`. The same handler array serves three
consumers that disagree about what they match against: the browser worker sees
absolute URLs (`http://localhost:4000/api/…`), while `@mswjs/http-middleware` —
the express server the mobile app talks to — sees bare paths (`/api/…`). A leading
`*` is the only form that satisfies both. Drop it and you get mocks that work on
web and 404 on device, which looks like a networking problem and is not one.

```ts
// CORRECT
http.get('*/api/posts', ...)
http.post('*/api/posts', ...)

// WRONG — does not match in either app
http.get('/api/posts', ...)
http.get('http://localhost:4000/api/posts', ...)
```

## Response format

Responses mirror the zod schemas in `@repo/core`, and
`packages/core/src/__tests__/mock-contract.test.ts` parses the real responses
against those schemas — a shape that drifts fails there, not three screens later.

Read from `db` (`packages/mocks/src/db.ts`) or a fixture module; never inline a
record in a handler:

```ts
import { db, userFromAuthHeader } from '../db';

http.get('*/api/posts', ({ request }) => {
  if (!userFromAuthHeader(request.headers.get('Authorization'))) {
    return HttpResponse.json({ message: 'Not authenticated.' }, { status: 401 });
  }

  // Every list endpoint returns this exact envelope — see api/pagination.ts.
  // `hasMore` is authoritative: the client feeds it straight to getNextPageParam.
  return HttpResponse.json({ items, page, pageSize, total: matching.length, hasMore });
});
```

Guard anything a real backend would guard. A mock that skips auth lets an
unauthenticated bug reach production.

## Fixtures

One file per resource in `packages/mocks/src/fixtures/<plural>.ts` (posts export
`initialPosts`, users export `users`). Keep them in sync with the zod schema in
`packages/core/src/features/<plural>/schemas.ts`.

Seeded collections belong in `db.ts` so `resetDb()` restores them between tests.
If a handler keeps its own module-local state instead, it **must** call
`registerReset(...)` — without it that state leaks between tests and surfaces as a
baffling "Not found" in an unrelated one. See `handlers/profile.ts`.

## The `post-fail` id

The post with id `post-fail` deliberately returns HTTP 500 on update — do not
remove it. It is the only way to manually verify the optimistic-update rollback.
