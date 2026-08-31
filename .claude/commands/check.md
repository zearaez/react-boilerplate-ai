---
description: Run the full quality gate and fix the code until it passes
---

Run `pnpm quality:check`. That is lint, typecheck, format, tests with coverage
thresholds, and the duplicate-dependency guard — the same gate CI runs.

If it fails, fix the **code** and re-run until clean. You may not:

- add an `eslint-disable`
- widen a type to `any` or add a non-null assertion to silence an error
- lower a coverage threshold in `vitest.config.ts`
- edit a generated file (`apps/*/global.css`) instead of its source
- use `--no-verify`

Most import-order and formatting failures are fixed by `pnpm lint:fix` — run that
first, then re-run the gate.

If a failure looks like a genuine configuration bug rather than bad code — for
example a version incompatibility, or a rule that cannot be satisfied — **stop and
explain it** rather than working around it. `docs/known-issues.md` lists the ones
already known.

When you are done, report what you changed and paste the final passing output. Do
not claim it passes without having seen it pass.
