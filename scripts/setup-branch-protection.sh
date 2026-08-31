#!/usr/bin/env bash
# Applies .github/rulesets/protected-branches.json to the current repo.
#
# Run ONCE per cloned project, by someone with admin rights:
#   ./scripts/setup-branch-protection.sh
#
# Why a script rather than clicking through Settings: audit item 7.3 asks whether
# status checks are REQUIRED before merge, and the only honest evidence is a
# ruleset that has actually been applied. Clicking is unrepeatable and undocumented.

set -euo pipefail

RULESET_FILE=".github/rulesets/protected-branches.json"

command -v gh >/dev/null 2>&1 || { echo "✖ gh CLI is required: https://cli.github.com" >&2; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "✖ jq is required" >&2; exit 1; }
[ -f "$RULESET_FILE" ] || { echo "✖ $RULESET_FILE not found — run from the repo root." >&2; exit 1; }

repo="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
echo "→ Applying rulesets to $repo"

count="$(jq '.rulesets | length' "$RULESET_FILE")"
for i in $(seq 0 $((count - 1))); do
  name="$(jq -r ".rulesets[$i].name" "$RULESET_FILE")"
  echo "  • $name"
  jq ".rulesets[$i]" "$RULESET_FILE" \
    | gh api "repos/$repo/rulesets" --method POST --input - >/dev/null \
    || echo "    ! failed (a ruleset named '$name' may already exist — delete it and re-run)"
done

cat <<'EOF'

  Done. Verify in Settings → Rules → Rulesets.

  Note the required check is named "CI OK" — the aggregator job in
  .github/workflows/quality.yml. It is the only required check on purpose: adding
  a job to that workflow without adding it to `ci-ok`'s `needs` would let it fail
  silently, so `ci-ok` is the single place that has to be right.

EOF
