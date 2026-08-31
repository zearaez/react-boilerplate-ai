# Documentation

## Start here

| If you want to…                     | Read                                                                         |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| Get running                         | [../README.md](../README.md) §3, then [onboarding.md](onboarding.md)         |
| Write code (human or agent)         | [../AGENTS.md](../AGENTS.md), then [patterns.md](patterns.md)                |
| Understand why it is built this way | [architecture/overview.md](architecture/overview.md)                         |
| Upgrade something                   | [versions.md](versions.md) — **read before touching a pin**                  |
| Fix something broken locally        | [troubleshooting.md](troubleshooting.md), [known-issues.md](known-issues.md) |
| Ship                                | [delivery.md](delivery.md)                                                   |
| Handle an incident                  | [runbook.md](runbook.md)                                                     |

## Everything

**Working in the repo**

- [onboarding.md](onboarding.md) — day one
- [conventions.md](conventions.md) — naming and file layout
- [patterns.md](patterns.md) — annotated tour of the demo slice
- [development-workflow.md](development-workflow.md) — branches, commits, hooks
- [outcode-git-branching-strategy.md](outcode-git-branching-strategy.md) — the org standard
- [testing.md](testing.md) — the Vitest/Jest split and coverage policy

**Reference**

- [versions.md](versions.md) — every pin and why
- [known-issues.md](known-issues.md) — upstream bugs worked around
- [troubleshooting.md](troubleshooting.md)
- [env-vars.md](env-vars.md)
- [environments.md](environments.md) — dev/uat/prod matrix
- [bug-reporter.md](bug-reporter.md) — the in-app bug reporter, and where reports go
- [api/README.md](api/README.md) — the API contract this client expects

**Architecture**

- [architecture/overview.md](architecture/overview.md)
- [architecture/data-flow.md](architecture/data-flow.md)
- [architecture/monorepo-graph.md](architecture/monorepo-graph.md)
- [architecture/decisions/](architecture/decisions/) — ADRs

**Operations**

- [delivery.md](delivery.md) — CI/CD, deployment, release, rollback
- [observability.md](observability.md) — Sentry, logging, PII
- [runbook.md](runbook.md) — incident response
- [security-and-privacy.md](security-and-privacy.md)

**Audit**

- [audit-report-2026-08-03.md](audit-report-2026-08-03.md) — the baseline
- [audit-clickup-tasks.md](audit-clickup-tasks.md) — the known gaps, as tickets
