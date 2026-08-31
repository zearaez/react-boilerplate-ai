---
description: Run the OutCode project audit and report only regressions
---

Run the `project-audit` skill against this repo, then **diff the result against
the committed baseline** rather than re-reading all 110 rows.

1. The baseline is the newest `docs/audit-report-*.md` already in the repo, with
   its expected score in its Summary table.
2. Run the audit. It writes `docs/audit-report-{today}.md` and
   `docs/audit-clickup-tasks.md`.
3. Compare section by section and report **only**:
   - items that went from Yes to No or Partial (regressions — the point of this)
   - items that went from No or Partial to Yes (fixed — worth noting)
   - the overall score delta
4. If nothing changed, say so in one line.

The five items expected to be Partial are listed in the baseline's own notes
(secret manager, required status checks, centralised log shipping, data
retention, GDPR flows). Those are known gaps with tickets, not regressions — do
not re-report them as findings.

Do not "fix" an audit item by weakening a check or by writing a document that
claims something the repo does not do.
