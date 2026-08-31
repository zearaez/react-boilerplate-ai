# Development workflow

The org-wide rules are in
[outcode-git-branching-strategy.md](outcode-git-branching-strategy.md); this page is
how they work in _this_ repo.

## The flow

```
feature/* → v{MAJOR}.{MINOR}.{PATCH} → develop → uat → prod → main
```

Feature branches are cut from a **version** branch, not from `develop`. `main`
tracks what is live in the app stores and is merged only after store approval.

```bash
git switch v1.2.0 && git pull
git switch -c feature/add-comments
```

## What the hooks do

| Hook         | Runs                                                |
| ------------ | --------------------------------------------------- |
| `pre-commit` | `scripts/branch-guard.sh` then `lint-staged`        |
| `commit-msg` | commitlint (Conventional Commits)                   |
| `pre-push`   | `scripts/branch-guard.sh` then `pnpm quality:check` |

`branch-guard.sh` **blocks** commits on `main`/`prod`/`uat`/`develop` and **warns**
on a branch name outside the convention. The block is duplicated in GitHub rulesets
— the hook exists so you find out before writing the commit, not after the push is
rejected.

`pre-push` runs the full gate, which is slow but is the same gate CI runs. A red
pipeline should be a surprise.

`--no-verify` exists. Using it means you own the CI failure, and AGENTS.md tells
agents never to use it.

## Commits

```
feat(mobile): add comment threads
fix(core): roll back optimistic update when the server rejects it
```

Scopes are enumerated in `commitlint.config.js`. Release notes are generated from
these, which is why the format is a gate rather than a preference.

## The inner loop

```bash
pnpm dev:web            # or dev:mobile, with pnpm mock running
pnpm test:watch
pnpm lint:fix           # before committing
```

Working on shared logic? `packages/core` is consumed as **raw TypeScript source** —
no build step, so a change is picked up by both apps immediately.

## Adding a feature

Always through the generator; it is what keeps the two platforms recognisably the
same. See [CONTRIBUTING.md](../CONTRIBUTING.md#adding-a-feature).

**If you change a shared hook or schema, update both apps in the same PR.** A PR
that changes one side is how the two drift.

## Opening a PR

Fill in the template, including screenshots of **both** platforms if you touched
shared code. `CI OK` must be green — it is the aggregator job, and the only required
check.

Approvals: 2 on `main`/`prod` (code-owner review required), 1 on `uat`/`develop`.

## One-time repo setup

After cloning the template into a new project:

```bash
./scripts/setup-branch-protection.sh     # applies the rulesets; needs admin + gh
```

Also update `.github/CODEOWNERS` — GitHub silently ignores owners it cannot resolve,
so a wrong team handle is worse than none.
