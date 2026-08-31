# OutCode Git branching strategy

The org-wide standard, reproduced here so the repo is self-contained. If the
canonical version in the org docs differs, that one wins — say so in a PR.

## Branches

```
feature/* → v{MAJOR}.{MINOR}.{PATCH} → develop → uat → prod → main
```

| Branch         | Purpose                        | Cut from             | Merges to                     |
| -------------- | ------------------------------ | -------------------- | ----------------------------- |
| `feature/*`    | one unit of work               | a **version** branch | its version branch            |
| `v{M}.{m}.{p}` | everything in one release      | `develop`            | `develop`                     |
| `develop`      | integration                    | —                    | `uat`                         |
| `uat`          | what testers see               | —                    | `prod`                        |
| `prod`         | what is deployed               | —                    | `main` (after store approval) |
| `main`         | what is live in the app stores | —                    | —                             |

**Feature branches come from a version branch, not from `develop`.** That is the part
people get wrong. It means a release can be reasoned about as a unit, and a version
branch can be held back without stranding half-finished features on `develop`.

**`main` is not the default working branch.** It records what users actually have,
which for a mobile app is whatever the stores approved — not whatever was deployed.

## Naming

| Prefix     | For                                     |
| ---------- | --------------------------------------- |
| `feature/` | new work                                |
| `bugfix/`  | a fix that goes through the normal flow |
| `hotfix/`  | an urgent fix that may skip ahead       |
| `release/` | release preparation                     |
| `chore/`   | tooling, dependencies                   |
| `docs/`    | documentation only                      |

Lowercase, dash-separated: `feature/add-comment-threads`.

## Protection

| Branch    | Approvals | Direct push | Code-owner review | Required check |
| --------- | --------- | ----------- | ----------------- | -------------- |
| `main`    | 2         | blocked     | yes               | `CI OK`        |
| `prod`    | 2         | blocked     | yes               | `CI OK`        |
| `uat`     | 1         | blocked     | no                | `CI OK`        |
| `develop` | 1         | blocked     | no                | `CI OK`        |
| `v*.*.*`  | 1         | allowed     | no                | `CI OK`        |

Applied by `./scripts/setup-branch-protection.sh` from
`.github/rulesets/protected-branches.json`, and mirrored locally by
`scripts/branch-guard.sh`.

## Hotfixes

1. Cut `hotfix/<description>` from `prod`.
2. PR into `prod`. Two approvals still apply — urgency is not a reason to skip review,
   it is a reason to get it fast.
3. Deploy.
4. **Merge back into `develop` and any open version branch**, same day. A hotfix that
   only exists on `prod` gets silently reverted by the next release, which is the
   single most common way a fixed bug comes back.

## Store releases

`prod → main` is a manual, environment-gated workflow
(`.github/workflows/merge-prod-to-main.yml`) requiring the store approval reference,
because store approval is the event that makes it true.

## Runbooks

**CI fails on a branch you did not touch** — usually a duplicate dependency or a
stale lockfile. Run `pnpm doctor`, then `pnpm install --frozen-lockfile`.

**A flaky test** — quarantine it in the same PR that files the issue, with the issue
number in the skip. A flaky test left in the gate teaches people to re-run without
reading, which is how a real failure gets ignored.

**Conflicts on a version branch** — rebase the feature branch onto the version
branch. Never merge the version branch into the feature branch; it makes the eventual
diff unreviewable.

**Abandoning a branch** — delete it. A stale branch with a green check looks like
work that is ready.
