# Incident runbook

## Severity

|        | Meaning                                               | Response                   | Comms               |
| ------ | ----------------------------------------------------- | -------------------------- | ------------------- |
| **P0** | Users cannot sign in or use a core flow; data at risk | immediate, drop everything | update every 30 min |
| **P1** | A major feature is broken; no workaround              | same working day           | update every 2 h    |
| **P2** | Degraded or cosmetic; workaround exists               | next planned work          | ticket only         |

A suspected data or credential exposure is **P0 regardless of user impact**, and also
follows [SECURITY.md](../SECURITY.md).

## First five minutes

1. **Is it us?** Check `/health` on the web deployment, then the API's own health
   endpoint. If the API is down, this is the backend team's incident — hand it over and
   say so explicitly.
2. **Scope it.** One environment or all? One platform or both? Sentry, filtered by
   environment and release.
3. **Declare it.** Post in the incident channel with severity, what users see, and who
   is driving. One driver at a time.
4. **Decide: roll back or fix forward.** Default to rolling back. A rollback is
   reversible; a hurried fix is not.

## Rolling back

Full commands in [delivery.md](delivery.md#rollback). In summary: web is an instant
Vercel promote; mobile JS-only is an EAS Update channel rollback; **mobile native has
no rollback** — halt the phased release and hotfix.

That asymmetry is the thing to remember at 2am, and it is why native changes should
ship on their own.

## Triaging in Sentry

Filter by environment and release first. Then:

- **A spike starting at a deploy** → that deploy. Roll back.
- **`kind: 'schema'` errors** → the backend changed a response shape. The zod parse
  caught it at the boundary rather than letting it corrupt state three screens later.
  Contact the backend team with the field name from the message.
- **`kind: 'network'` spike** → likely the API or a CDN, not this code.
- **`kind: 'unauthorized'` spike** → token handling or an auth-service change; check
  whether users are being signed out mid-session.

## Comms template

```
[P?] <what users experience>
Started:   <time, timezone>
Scope:     <environments and platforms>
Impact:    <who cannot do what>
Cause:     <known / under investigation>
Action:    <rolling back / fixing forward>
Driver:    <name>
Next update: <time>
```

## After

Within two working days, a blameless post-mortem covering: timeline, user impact, root
cause, why it was not caught (**which gate should have caught this?**), and actions with
owners.

Then close the loop in the repo. If a gate could have caught it, add the check — that is
how `assert-css-output.mjs` and `assert-native-styles.mjs` came to exist. If a hotfix
went to `prod`, confirm it is merged back into `develop` and any open version branch,
because a hotfix that only exists on `prod` gets silently reverted by the next release.

## Escalation

On-call rotation and escalation are handled at the org level rather than per repo.
Status page: not configured for this template — see task notes in
[audit-clickup-tasks.md](audit-clickup-tasks.md).
