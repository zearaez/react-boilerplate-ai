# Security policy

## Reporting a vulnerability

Email **security@outcodesoftware.com** with the affected version or commit, the
impact, and reproduction steps. Do not open a public issue and do not include a
working exploit in the first message.

| Stage              | Target         |
| ------------------ | -------------- |
| Acknowledgement    | 2 working days |
| Initial assessment | 5 working days |
| Fix for critical   | 14 days        |
| Fix for high       | 30 days        |

## What this repo is

Two frontend clients. There is no server and no database here, so the classes of
issue that apply are: exposure of credentials in a shipped bundle, insecure local
token storage, dependency vulnerabilities, and anything that weakens a delivery
gate. Server-side authorisation is the API's responsibility.

## Deliberate security decisions

These look like omissions and are not.

**Web access tokens are memory-only.** `apps/web/src/lib/storage.ts` keeps the
session in a `Map`, never `localStorage`, because anything an XSS payload can read
is not a place for a bearer token. `localStorage` and `sessionStorage` are banned
repo-wide by `no-restricted-globals` so this cannot quietly erode. The trade is
that a hard reload signs the user out; the real fix is an httpOnly refresh cookie
from the backend.

**Mobile tokens go in SecureStore**, which is hardware-backed and app-scoped, so
persisting there is correct. The adapter rejects values over 2000 bytes with an
explanatory error, because iOS caps keychain items at 2048 and otherwise fails
opaquely at write time.

**No refresh-token rotation.** A partially implemented rotation is worse than
none — it hides the failure mode. A 401 signs the user out; the route guards on
both platforms react to the session store.

**`<Stack.Protected>` and `<ProtectedLayout>` are routing, not security.** They
decide what renders. The API authorises every request regardless.

## Secrets

Nothing prefixed `VITE_` or `EXPO_PUBLIC_` is secret — it is inlined into a
shippable bundle. Real secrets belong in GitHub Environments (CI) and EAS secrets
(mobile builds). `.gitignore` covers `.env*`, `*.pem`, `*.key`, `*.p8`,
`*.keystore`, `credentials.json` and `google-services.json`, and `.claude/settings.json`
denies reading them.

A dedicated secret manager (Vault / 1Password / AWS Secrets Manager) is **not**
configured in this template — see `docs/audit-clickup-tasks.md`, task 1.
