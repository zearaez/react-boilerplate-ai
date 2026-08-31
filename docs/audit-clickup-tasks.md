# Audit tasks

Generated from `docs/audit-report-2026-08-03.md`. One task per item that is not a
pass.

The original tasks 2 (E2E tests) and 6 (app-layer coverage) are **done** and have
been removed: Playwright now covers the demo flow against the production bundle, and
every web feature page has behavioural tests. Section 15 scores 100%. These are the template's **known, accepted** gaps — they are tracked rather
than hidden, and `/audit` should not re-report them as findings.

Push with `/push-clickup-tasks docs/audit-clickup-tasks.md <list-id>`.

---

## Task 1: Apply branch-protection rulesets to this repository

| Field         | Value                       |
| ------------- | --------------------------- |
| Priority      | High                        |
| Checklist Ref | 7.3                         |
| Audit Status  | Partial                     |
| Section       | Code Review & Quality Gates |

### Current State

`.github/rulesets/protected-branches.json` and `scripts/setup-branch-protection.sh`
ship with the template, and `scripts/branch-guard.sh` blocks local commits to
protected branches. But a ruleset file is only documentation until it is applied —
until someone runs the script, nothing server-side requires `CI OK` before merge.

### Required Changes

Run `./scripts/setup-branch-protection.sh` once, as a repo admin with `gh`
authenticated. Then confirm in Settings → Rules → Rulesets that `CI OK` is listed as
required on `main`, `prod`, `uat`, `develop` and `v*.*.*`.

Also replace the placeholder team handles in `.github/CODEOWNERS` — GitHub silently
ignores owners it cannot resolve, so a wrong handle is worse than none.

### Acceptance Criteria

- Three rulesets are active with the approval counts in
  `docs/outcode-git-branching-strategy.md` (2 for main/prod, 1 for uat/develop).
- A PR with a failing check cannot be merged.
- A direct push to `develop` is rejected by the server, not only by the local hook.
- Every team in CODEOWNERS resolves.

### Files Likely Involved

`.github/rulesets/protected-branches.json`, `scripts/setup-branch-protection.sh`,
`.github/CODEOWNERS`

---

## Task 2: Adopt a secret manager

| Field         | Value              |
| ------------- | ------------------ |
| Priority      | Medium             |
| Checklist Ref | 2.3                |
| Audit Status  | Partial            |
| Section       | Security & Secrets |

### Current State

Secrets live in GitHub Environments (CI) and EAS secrets (mobile builds), which is a
reasonable baseline: they are scoped per environment and not in the repo. There is no
dedicated secret manager, so there is no rotation policy, no audit trail of access,
and no single place a developer can self-serve a UAT value.

### Required Changes

Choose one of Vault, 1Password Connect, or AWS Secrets Manager at the org level.
Store the uat/production `.env` values there, document retrieval in
`docs/security-and-privacy.md`, and reference it from `docs/onboarding.md` §5 so new
developers stop asking colleagues.

### Acceptance Criteria

- Every non-public value has exactly one authoritative home.
- Onboarding documents how to retrieve values without a colleague sharing a screen.
- A rotation procedure exists and names an owner.

### Files Likely Involved

`docs/security-and-privacy.md`, `docs/onboarding.md`, `.env.example`

---

## Task 3: Ship production logs to a centralised service

| Field         | Value                |
| ------------- | -------------------- |
| Priority      | Medium               |
| Checklist Ref | 10.4                 |
| Audit Status  | Partial              |
| Section       | Logging & Monitoring |

### Current State

Sentry receives errors and breadcrumbs, and `logger` already emits structured JSON in
production with PII redacted. The full log stream is not shipped anywhere, so
questions like "what did this user do before the error" are only answerable from
breadcrumbs on captured events.

### Required Changes

Add a transport to `apps/web/src/lib/observability.ts` (and the mobile equivalent)
targeting the org's log platform — Datadog, CloudWatch or ELK. The transport
interface already exists: `setLogTransports([...])` takes an array, and a throwing
transport cannot break the caller.

Batch and rate-limit client-side; a per-line HTTP request from a browser is not
acceptable.

### Acceptance Criteria

- Production `logger.info`/`warn`/`error` lines are queryable in the log platform
  within a minute.
- Redaction still applies — assert it with a test, not by inspection.
- Volume is bounded and the transport degrades silently when the endpoint is down.

### Files Likely Involved

`apps/web/src/lib/observability.ts`, `packages/core/src/logger.ts`,
`docs/observability.md`

---

## Task 4: Implement refresh-token handling

| Field         | Value                 |
| ------------- | --------------------- |
| Priority      | Medium                |
| Checklist Ref | 8.2                   |
| Audit Status  | Partial               |
| Section       | Auth & Access Control |

### Current State

There is deliberately no refresh flow: a 401 clears the session and the route guards
react. That is a correct, non-misleading behaviour — a half-implemented rotation is
worse than none — but it means token lifetime is entirely the API's concern, and a
short lifetime produces frequent forced sign-outs. On web the token is memory-only,
so a page reload also signs the user out.

### Required Changes

Once the backend exposes refresh: implement rotation inside the axios response
interceptor with a **single-flight** promise, so concurrent 401s trigger one refresh
rather than one each. Cap retries and fall back to sign-out. On web, prefer an
httpOnly refresh cookie so reload-persistence does not require putting anything in
JavaScript-readable storage.

### Acceptance Criteria

- Concurrent 401s trigger exactly one refresh call — asserted by a test.
- A failed refresh signs the user out cleanly with no request loop.
- Web survives a reload without putting an access token in `localStorage`.

### Files Likely Involved

`packages/core/src/api/client.ts`, `packages/core/src/features/auth/`,
`apps/web/src/lib/storage.ts`, `docs/security-and-privacy.md`

---

## Task 5: Add privacy policy and terms

| Field         | Value                |
| ------------- | -------------------- |
| Priority      | Medium               |
| Checklist Ref | 19.1                 |
| Audit Status  | Partial              |
| Section       | Privacy & Compliance |

### Current State

`docs/security-and-privacy.md` documents what data the client holds and states that
legal screens are required at launch, but no policy or terms exist — the text is
project-specific and a template cannot supply it. App-store submission requires a
privacy policy URL, so this blocks a mobile release.

### Required Changes

Obtain the reviewed policy text. Add reachable screens or external links on both
platforms, plus the privacy policy URL in App Store Connect and Play Console.

### Acceptance Criteria

- Both documents are reachable from within both apps.
- The privacy policy URL is set in both store listings.
- Content is reviewed by whoever owns legal for the project.

### Files Likely Involved

`apps/web/src/features/legal/`, `apps/mobile/app/(app)/legal/`,
`docs/security-and-privacy.md`

---

## Task 6: Implement GDPR/CCPA data-subject flows

| Field         | Value                |
| ------------- | -------------------- |
| Priority      | Medium               |
| Checklist Ref | 19.4                 |
| Audit Status  | Partial              |
| Section       | Privacy & Compliance |

### Current State

Erasure, export and consent are backend capabilities and are documented as such. No
client-side flows exist, so a user cannot exercise those rights from the app.

### Required Changes

Once the backend exposes the endpoints, add the account screens: request export,
request deletion (with confirmation), and manage consent. Follow the standard feature
shape — `pnpm gen feature`, schemas in `@repo/core`.

### Acceptance Criteria

- A user can request export and deletion from both apps.
- Deletion requires explicit confirmation and states what will be removed.
- Consent state is persisted server-side, not only locally.

### Files Likely Involved

`packages/core/src/features/account/`, `apps/web/src/features/account/`,
`apps/mobile/app/(app)/account/`

---

## Task 7: Define a client-side data retention policy

| Field         | Value                |
| ------------- | -------------------- |
| Priority      | Low                  |
| Checklist Ref | 19.2                 |
| Audit Status  | Partial              |
| Section       | Privacy & Compliance |

### Current State

`docs/security-and-privacy.md` inventories what the client holds — a session token and
the current user in memory — and notes nothing outlives the session. There is no
written retention policy naming durations and an owner, and server-side retention is
out of scope for this repo.

### Required Changes

Write the retention table: each category of client-side data, where it lives, its
lifetime, and how it is cleared. Cross-reference the backend's policy. Confirm the
TanStack Query `gcTime` and any future offline cache are consistent with it.

### Acceptance Criteria

- A retention table exists with durations and an owner.
- Cache lifetimes in code match the documented policy.

### Files Likely Involved

`docs/security-and-privacy.md`, `packages/core/src/query/client.ts`

---

## Task 8: Clear the transitive `uuid` advisory

| Field         | Value        |
| ------------- | ------------ |
| Priority      | Low          |
| Checklist Ref | 5.4          |
| Audit Status  | Partial      |
| Section       | Dependencies |

### Current State

`pnpm audit` reports one MODERATE advisory: `uuid <11.1.1` (missing buffer bounds
check in v3/v5/v6 when `buf` is supplied). It arrives transitively through
`expo → @expo/cli → @expo/config-plugins → xcode → uuid`, so it is **build-time and
dev-only** — `xcode` is used during `expo prebuild`, never at runtime.

It is deliberately **not** overridden. Forcing `uuid@>=11` on a consumer written for
the v3 API would break it, because uuid 7 removed the default export. Trading a
dev-only moderate for a broken prebuild is the wrong trade.

The two HIGH `postcss` advisories found in the same audit **were** fixed, by raising
the pin to 8.5.25 and adding an `overrides` entry.

### Required Changes

Track the advisory. Re-check on each Expo SDK upgrade — this resolves upstream when
`xcode` or `@expo/config-plugins` bumps its `uuid`. Do not add an override without
verifying `expo prebuild` still succeeds on both platforms.

### Acceptance Criteria

- `pnpm audit --prod` shows no HIGH or CRITICAL advisories.
- The remaining moderate is either resolved upstream or re-confirmed as dev-only at
  each SDK upgrade.

### Files Likely Involved

`pnpm-workspace.yaml`, `docs/known-issues.md`
