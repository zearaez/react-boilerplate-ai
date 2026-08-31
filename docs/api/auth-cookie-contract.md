# The httpOnly refresh-cookie contract

**Status: the client half is implemented and shipped. The API half is a spec for
whichever backend this starter is pointed at** — until it lands, `POST /auth/login`
carries no `Set-Cookie` and the cold-start probe below simply comes back empty.

This document is the spec the client was written against.

> **This is now security hardening, not a feature.** Web sessions already survive a
> reload — the session is persisted in `localStorage`, which means the thirty-day
> refresh token is readable by any script injected into the origin. That decision and
> its consequences are recorded in
> [../security-and-privacy.md](../security-and-privacy.md). Shipping the cookie is
> what removes that exposure: `apps/web/src/lib/storage.ts` goes back to
> `createMemoryStorage()`, the `no-restricted-globals` override in
> `apps/web/eslint.config.js` is deleted, and persistence keeps working because the
> cookie takes over. Nothing else in the client changes.

## Why this exists

Web token storage is memory-only — `apps/web/src/lib/storage.ts`, enforced by a
repo-wide `no-restricted-globals` ban on `localStorage` and `sessionStorage`. The
reason is audit item 19.3: anything an XSS payload can read is not a place for a
bearer token, and the refresh token is the worst thing to expose because it is the
thirty-day credential.

The cost is that a hard reload signs a web user out, because nothing survives it.
An httpOnly cookie is the only mechanism that survives a reload **and** stays
unreadable to JavaScript. There is no third option: any client-readable store is
XSS-readable, and any in-memory store dies with the page.

Mobile does not have this problem — `expo-secure-store` is hardware-backed — so
this is a web fix that mobile must not regress.

## What the API must do

### 1. `POST /auth/login` sets the cookie

Keep the response body as it is, minus the refresh token:

```http
HTTP/1.1 200 OK
Set-Cookie: kf_refresh=<opaque>; HttpOnly; SameSite=Lax; Path=/auth; Max-Age=2592000
Content-Type: application/json

{
  "access_token": "…",
  "access_token_expires_at": "2026-08-27T11:21:28Z"
}
```

- `HttpOnly` is the entire point. Without it this buys nothing over `localStorage`.
- `Path=/auth` — the cookie is only ever needed by `/auth/refresh` and
  `/auth/logout`. Scoping it there means it is not attached to the other 47
  endpoints, so it cannot be used to authenticate them by accident.
- `Max-Age` should match the refresh token's real lifetime (thirty days today).
- **`refresh_token` and `refresh_token_expires_at` MAY be omitted from the body.**
  The client already treats both as optional. Omitting them for web is what
  actually removes the credential from JavaScript's reach — leaving them in means
  an XSS payload can still read the login response.

### 2. `POST /auth/refresh` accepts the cookie instead of a body

It must work with **no request body at all**, taking the refresh token from the
cookie, and keep working with `{ "refresh_token": "…" }` for mobile. Rotation
stays as it is: issue a new token, invalidate the presented one, and send a new
`Set-Cookie`.

Keep answering **400** for a missing, spent or unknown token. Not 401 — the
client's refresh interceptor keys on 401, and a 401 here would make a dead cookie
look like an expired access token and loop.

### 3. `POST /auth/logout` — new endpoint

```http
POST /auth/logout          → 204 No Content
Set-Cookie: kf_refresh=; HttpOnly; SameSite=Lax; Path=/auth; Max-Age=0
```

An httpOnly cookie can only be cleared by the server that set it, so without this
a sign-out leaves a live credential in the browser and the next cold start signs
the user straight back in — a sign-out button that does not sign you out. It
should also revoke the refresh token server-side, which closes the "no revoke
endpoint" gap in [README.md](README.md).

Idempotent: 204 whether or not a cookie was presented.

### 4. Transport

`SameSite` and `Secure` depend on whether the API is same-origin with the web app:

| Deployment                           | Cookie attributes       | CSRF                                  |
| ------------------------------------ | ----------------------- | ------------------------------------- |
| Same origin (or behind a path proxy) | `SameSite=Lax`          | Not needed for this cookie            |
| Cross-origin (`api.example.com`)     | `SameSite=None; Secure` | **Required** on `/auth/*` — see below |

Two hard constraints:

- **`Secure` cookies are refused over plain `http://`** on any host but
  localhost. The API is currently plain HTTP on a raw IP, so a cross-origin cookie
  cannot work at all until it has TLS and a hostname.
- **CORS must keep sending `Access-Control-Allow-Credentials: true` with an
  explicitly echoed origin.** A wildcard `Access-Control-Allow-Origin` is rejected
  by browsers once credentials are involved. The current allowlist is exact —
  `localhost:5173` and `localhost:5174` and nothing else — so any other dev port
  fails CORS outright. Add ports deliberately rather than widening to `*`.

If you go `SameSite=None`, `/auth/refresh` and `/auth/logout` need CSRF
protection, because a third-party page could then trigger them. A double-submit
token or an `Origin` check is enough; neither endpoint returns anything an
attacker can read, so the realistic damage is forced rotation and forced logout
rather than account takeover.

## What the client already does

No further client work is needed when the above ships.

| Behaviour                                                                | Where                                       |
| ------------------------------------------------------------------------ | ------------------------------------------- |
| `withCredentials: true` on the shared instance and the bare refresh call | `packages/core/src/api/client.ts`           |
| Refresh sends no body when no token is in memory                         | `performRefresh` in the same file           |
| `refresh_token` optional on the wire and in the persisted session        | `features/auth/schemas.ts`                  |
| Cold-start probe: `POST /auth/refresh` → `GET /users/me`, 5s timeout     | `restoreSessionFromCookie` in `auth/api.ts` |
| Startup reads storage first, then falls back to the cookie probe         | `bootstrapSession` in `auth/session.ts`     |
| Sign-out calls `POST /auth/logout`, tolerating today's 404               | `logout` in `auth/api.ts`                   |
| A session with no readable refresh expiry is trusted, not discarded      | `hydrate` in `auth/store.ts`                |
| Optional same-origin dev proxy so a cookie works in dev over plain HTTP  | `apps/web/vite.config.ts`                   |

Both apps call `bootstrapSession()` at startup and await it before revealing UI —
web before `createRoot`, mobile with the splash screen up — which is what stops
the login screen flashing before the probe answers.

### Today's cost of the probe

Until the cookie exists, every cold start makes one `POST /auth/refresh` that
returns 400 and is discarded. It is capped at 5 seconds, kept out of the bug
reporter's breadcrumbs via the `isSessionProbe` flag, and skipped entirely
whenever storage already holds a session — so mobile only pays it on a fresh
install.

### Verifying it in dev

A cookie will not cross origins in dev, so it needs a same-origin dev proxy:

```bash
# repo-root .env
VITE_ENABLE_MOCKS=false
VITE_API_URL=/api
VITE_API_PROXY_TARGET=http://localhost:8080
```

Then `pnpm dev:web`, sign in, and hard-reload. Staying signed in means the
contract works end to end. Without `VITE_API_PROXY_TARGET` nothing is proxied and
behaviour is exactly as it was.

## What this does NOT change

- **Access tokens stay bearer tokens in memory.** Every non-auth endpoint keeps
  authenticating exactly as it does now, and the access token is never persisted
  on web. Moving _all_ auth to the cookie would mean every endpoint accepting
  cookie auth plus CSRF protection on every mutation — a much larger API change
  for no gain in what a reload can restore.
- **Mobile keeps using the body token.** A native cookie jar is not a credential
  store this app controls, and its persistence across app restarts is not
  guaranteed, so `refresh_token` must keep being sent to mobile clients. If the
  server ever omits it unconditionally, mobile persistence regresses to whatever
  the platform cookie jar happens to do — which is why the field is optional
  rather than removed.
