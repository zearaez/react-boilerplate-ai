# API contract

The API lives in a separate repository. This is what the clients expect, and what the
mock in `packages/mocks` implements — the two are kept honest by
`packages/core/src/__tests__/mock-contract.test.ts`, which parses the mock's actual
responses through the same zod schemas the app uses.

The schemas in `packages/core/src/features/*/schemas.ts` are the machine-readable
version of this document. Where they disagree, the schemas win.

## Conventions that bite

Three things about this API differ from what a JS client usually assumes. Each one
is handled in exactly one place, and each has a test.

**The wire is snake_case.** `access_token`, `page_size`, `created_at`. Translation
happens once, in the zod schema's `.transform()`, so nothing past the api layer sees
an underscore.

**Integers may arrive as strings.** A .NET server types every int as
`"type": ["integer", "string"]` with a numeric `pattern`. `z.coerce.number()`, not
`z.number()` — the latter rejects a legitimate response and blames the schema.

**Pagination parameters are capitalised.** `?Page=1&PageSize=10`, because the server
binds a .NET record — while sibling filters on the same endpoint stay lower-case
(`status`, `owner_id`). Use `pagedQuery()` from `@repo/core`; getting it wrong is
silent, as the server just serves page 1 forever.

## Auth

`POST /auth/login` — `{ email, password }` →

```json
{
  "access_token": "…",
  "access_token_expires_at": "2026-08-12T10:15:00Z",
  "refresh_token": "…",
  "refresh_token_expires_at": "2026-09-11T10:00:00Z"
}
```

**No user object.** A session therefore takes two round trips: login, then
`GET /users/me`. `login()` in `@repo/core` does both and returns the pair.

`POST /auth/refresh` — `{ refresh_token }` → the same shape.

**Refresh tokens rotate**: the presented token is invalidated and a new one issued.
This is why `api/client.ts` refreshes _single-flight_ — four concurrent 401s must
produce one refresh, not four, or three of them spend an already-revoked token and
sign out a healthy session. There is a test for exactly that.

`refresh_token` is **optional** in the response body: under the cookie contract the
browser gets it as an httpOnly `Set-Cookie` instead, where JavaScript — and an XSS
payload — cannot read it. See [auth-cookie-contract.md](auth-cookie-contract.md).

`GET /users/me` →

```json
{
  "id": "…",
  "name": "…",
  "email": "…",
  "phone": null,
  "role": "member",
  "created_at": "2026-01-04T09:00:00Z"
}
```

`role` is one of `member | admin` — the list lives in `USER_ROLES` in
`features/auth/schemas.ts`, and both apps read roles from there. `phone` is genuinely
nullable: "no phone" and "empty phone" are different things.

`PATCH /users/me` — `{ user_id, name, phone }` → the updated user. The id comes from
the session, never from the caller, or a form could patch someone else's profile.

`POST /users/me/password` — `{ current_password, new_password }` → 204, and it
**revokes every refresh token, including this session's**. It is the only
server-side revocation the API has, so a caller must treat success as "signed out
everywhere" and re-authenticate.

`POST /auth/logout` → 204, idempotent. Signing out drops the tokens locally
regardless of the outcome — but the endpoint is not optional under the cookie
contract, because an httpOnly cookie can only be cleared by the server that set it.

`POST /auth/forgot-password` — `{ email }` → **202** with exactly
`{ "status": "sent" }`, whether or not the address belongs to an account. A 404 for
unknown addresses would make this an account-enumeration oracle, which is also why
the UI never claims an email _was_ sent.

`POST /auth/reset-password` — `{ token, password }` → 204. It does **not** sign the
user in: a reset link may have been forwarded or screenshotted, so it is worth one
password change and not a session.

## Pagination

List endpoints take `?Page=1&PageSize=10` and return:

```json
{ "items": [], "page": 1, "page_size": 10, "total_count": 48 }
```

There is **no `hasMore`** — the client derives it in `paginated()` as
`page * page_size < total_count`. Do not add one to a mock; the derivation is what
ships.

## Errors

RFC 7807 `ProblemDetails`, as ASP.NET Core emits:

```json
{
  "type": "…",
  "title": "Bad Request",
  "status": 400,
  "detail": "That email is taken.",
  "instance": "…"
}
```

Validation failures add `errors: { "field": ["message"] }` — already the shape
`fieldErrors` wants.

`toApiError` reads `detail` first, then `title`: `detail` carries the specific
explanation, `title` only the generic status phrase, and preferring `title` would
turn every validation message into "Bad Request".

Two status codes worth stating, because they are not what a client would guess:

| Case                        | Status  | Body                                                         |
| --------------------------- | ------- | ------------------------------------------------------------ |
| Bad email/password          | **400** | ProblemDetails, `detail: "Invalid email or password"`        |
| Spent/invalid refresh token | **400** | ProblemDetails, `detail: "Invalid or expired refresh token"` |
| Missing or bad bearer token | **401** | **empty** — no ProblemDetails at all                         |

The 400-not-401 on login matters more than it looks: the client's refresh
interceptor keys on 401, so a 401 there would make every mistyped password attempt a
token refresh — and end a valid session on a re-auth prompt.

### Server messages are not translatable

The login form renders `error.message` — i.e. the server's `detail` string, in
English, regardless of locale. `auth.invalidCredentials` exists in `en.json` for the
day that changes. Closing this means mapping status codes to translated strings
instead of displaying `detail`; it is a UI decision, not an API one, so it is
recorded here rather than silently patched.

| Status      | Client behaviour                                    |
| ----------- | --------------------------------------------------- |
| 400 / 422   | `kind: 'validation'`, field errors shown on inputs  |
| 401 / 403   | `kind: 'unauthorized'` — 401 triggers refresh first |
| 404         | `kind: 'notFound'`                                  |
| 5xx         | `kind: 'server'`, retried up to twice with backoff  |
| no response | `kind: 'network'`, retried                          |

**4xx is never retried** — the request is wrong, not unlucky.

## The demo slice

`/api/posts` and `/api/profile` are template scaffolding: they exist in
`packages/mocks` as the reference implementation of a paginated CRUD list and a
settings-style form. They are meant to be replaced by real features, not pointed at a
real server.

## Requirements on the API

- **Never return a field the schema does not declare with a compatible type.** A
  changed shape surfaces as `kind: 'schema'` and the screen fails.
- Timestamps are ISO 8601 with an offset (`z.iso.datetime({ offset: true })`).
- Ids are strings.
- CORS must allow the web origins explicitly in production, with
  `Access-Control-Allow-Credentials: true` for the refresh cookie.
- Rate-limit `/auth/login` and `/auth/refresh`.
- Serve TLS on a real hostname. Browsers block mixed content, so a deployed HTTPS web
  app cannot call a plain-HTTP API; iOS ATS and Android (API 28+) block cleartext
  too, and a dev-only exception must never ship.
