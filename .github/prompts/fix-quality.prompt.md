---
mode: agent
description: Run the full quality gate and fix the code until it passes
---

Run `pnpm quality:check`. That is lint, typecheck, format check, tests with
coverage thresholds, and the duplicate-dependency guard — the exact same gate CI
runs.

## Fixing failures

If it fails, fix the **code** and re-run until clean. You may not:

- add an `eslint-disable`
- widen a type to `any` or add a non-null assertion to silence an error
- lower a coverage threshold in `vitest.config.ts`
- edit a generated file (`apps/*/global.css`) instead of its source
- use `--no-verify`

Most import-order and formatting failures are fixed by:

```bash
pnpm fix
```

Run that first, then re-check.

## Stopping conditions

If a failure looks like a genuine configuration bug (version incompatibility, or a
rule that cannot be satisfied without changing correct code) — **stop and explain
it** rather than working around it. Check `docs/known-issues.md` first.

## Done

Report what changed and paste the final passing output. Do not claim it passes
without having seen it pass.
