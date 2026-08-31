# Security and privacy

Reporting a vulnerability: [SECURITY.md](../SECURITY.md).

## What this repo is

Two frontend clients. No server, no database. The classes of issue that apply here
are: credentials in a shipped bundle, insecure local token storage, dependency
vulnerabilities, and anything that weakens a delivery gate. **Authorisation is the
API's job** — the route guards here decide what renders, not what is permitted.

## Token storage

|                  | Web                                                 | Mobile                                              |
| ---------------- | --------------------------------------------------- | --------------------------------------------------- |
| Where            | `localStorage`, via `apps/web/src/lib/storage.ts`   | `expo-secure-store`                                 |
| Survives reload? | yes                                                 | yes                                                 |
| Survives XSS?    | **no — a script on this origin can read the token** | yes — other apps cannot read the keychain           |
| Why              | a session that died on every reload was not usable  | keychain/keystore is hardware-backed and app-scoped |

`localStorage` and `sessionStorage` remain banned repo-wide by
`no-restricted-globals`. There is exactly ONE override, scoped to
`apps/web/src/lib/storage.ts` in `apps/web/eslint.config.js`, so a second call site
still fails the lint — the ban's real job is stopping a credential from ending up
somewhere nobody is watching.

**This was a deliberate trade, and it is now the weakest point in the app's security
posture.** Web token storage was memory-only until 2026-08-27, on the reasoning in
audit item 19.3: anything an XSS payload can read is not a place for a bearer token.
The cost was that a hard reload signed the user out, which was judged unacceptable
for the product, so the session is persisted and the exposure accepted.

Be precise about what is exposed. The persisted refresh token is the **thirty-day**
credential: a script injected into this origin can read it, exfiltrate it, and use it
from anywhere until it expires or the user changes their password
(`POST /users/me/password` is what revokes server-side). Persisting only the access
token would have been a fifteen-minute problem; this is not.

No client-side arrangement avoids that. Any store JavaScript can read, injected
JavaScript can read; any store it cannot read cannot survive a reload either. The one
mechanism that gets both is an httpOnly cookie, which the API does not set — verified
against the live server, specified in
[api/auth-cookie-contract.md](api/auth-cookie-contract.md), and already supported by
this client. Shipping it is what lets this file go back to `createMemoryStorage()` and
deletes the lint override with it.

Until then the compensating controls are the ones that keep script injection out, and
they carry more weight than they used to: a strict CSP, no `dangerouslySetInnerHTML`,
no `eval`, every user-facing string rendered as text, and dependency review — an XSS
in any bundled package is now a session compromise. Sign-out clears the key, with an
e2e test asserting it, because a persisted session that outlives sign-out is worse
than no persistence at all.

The mobile adapter rejects values over 2000 bytes with an explanatory error, because
iOS caps keychain items at 2048 and otherwise fails opaquely at write time.

## Session lifetime

A session should end when the refresh token does, and not a moment sooner. Two rules
in `api/client.ts` are what make that true.

**Refresh is single-flight.** The API rotates refresh tokens, so four concurrent
401s must produce one refresh, not four — otherwise the first wins and the other three
present a just-revoked token, fail, and sign out a healthy session. One shared
in-flight promise; there is a test for exactly that.

**A refresh that fails is not the same as a refresh that is refused.** Only `400`,
`401` or `403` from `/auth/refresh` mean the credential is dead, and `400` is the one
the live server actually sends (`detail: "Invalid or expired refresh token"`).
Anything else — offline, DNS, timeout, CORS, a 5xx, or a body that fails
`authTokensSchema` — leaves the session alone, because none of it is evidence about
the token. The refresh window is thirty days, so a signed-in user spends nearly all of
it one dropped connection away from an attempt; collapsing the two cases turns a
tunnel or a deploy into a sign-out.

The rotation caveat, stated rather than hidden: if the server issued a new pair and
only the response was lost, the stored token is already spent and the next attempt
returns `400` and signs out properly. Holding on costs one extra failed refresh there;
signing out eagerly costs a lost session in every other case.

## Deliberate omissions

**No secret manager.** Secrets live in GitHub Environments and EAS secrets. A dedicated
manager (Vault / 1Password Connect / AWS Secrets Manager) is task 1 in
[audit-clickup-tasks.md](audit-clickup-tasks.md).

## Transport and headers

`apps/web/vercel.json` sets HSTS with preload, `X-Content-Type-Options`,
`X-Frame-Options: DENY`, `Referrer-Policy`, a restrictive `Permissions-Policy`, and a
CSP.

The CSP allows `'unsafe-inline'` on `style-src` only — Radix sets inline styles for
positioning, so it is unavoidable — and **not** on `script-src`, which is the one that
matters. Widen `connect-src` per environment if your API is on another origin.

The same headers are mirrored in `apps/web/nginx.conf` for self-hosted deployments.

## Input validation

Every request body is validated with zod before it leaves the client, and every
response is parsed before it is used. Client-side validation is a UX feature, not a
security control — the API must validate independently.

## Dependencies

Dependabot weekly, grouped by concern. Six packages are deliberately pinned behind
`latest` and excluded from automated bumps; each is justified in
[versions.md](versions.md). CodeQL runs on PRs and weekly.

`allowBuilds` in `pnpm-workspace.yaml` is an explicit allowlist of packages permitted
to run postinstall scripts — pnpm 11 blocks them by default, and that default is worth
keeping.

## Privacy

**Data this repo holds:** a session token (memory on web, keychain on mobile) and the
signed-in user's id, name, email and role in memory while the app runs. Nothing else is
persisted client-side. Clearing app data or signing out removes all of it.

**Retention** is the backend's responsibility; there is nothing here with a lifetime
beyond the session. Client-side retention policy: task 4.

**GDPR/CCPA** — erasure, export and consent flows are backend features and are not
implemented here. The client-side work would be the screens that call them. Task 5.

**Logs** exclude PII by construction (see [observability.md](observability.md)), and
Sentry runs with `sendDefaultPii: false` and Session Replay off.

**Legal screens** — a real project needs a privacy policy and terms reachable from
the app, and app-store submission requires a privacy policy URL. Not included in the
template, because the text is project-specific.
