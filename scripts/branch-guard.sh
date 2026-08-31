#!/bin/sh
# Blocks commits and pushes to protected branches, and checks branch naming.
#
# Implements the OutCode branching strategy (docs/outcode-git-branching-strategy.md):
#
#   feature/* → v{MAJOR}.{MINOR}.{PATCH} → develop → uat → prod → main
#
# Feature branches are cut from a VERSION branch, never from develop.
#
# GitHub branch protection is the real enforcement — see
# .github/rulesets/protected-branches.json and scripts/setup-branch-protection.sh.
# This hook exists so you find out before you have written the commit, not after
# the push is rejected.

set -e

PROTECTED='main prod uat develop'
branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"

# Detached HEAD (rebase, bisect): nothing to check.
[ -z "$branch" ] && exit 0
[ "$branch" = "HEAD" ] && exit 0

# No commits yet — this is the initial import. Blocking it would be a catch-22:
# you cannot branch off a repository that has no commits, so the first commit has
# to land on the default branch.
if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  exit 0
fi

for protected in $PROTECTED; do
  if [ "$branch" = "$protected" ]; then
    cat >&2 <<EOF

  ✖ '$branch' is a protected branch — commit to a feature branch instead.

    git switch -c feature/your-change

    Flow: feature/* → v{MAJOR}.{MINOR}.{PATCH} → develop → uat → prod → main
    Feature branches are cut from a VERSION branch, not from develop.
    See docs/outcode-git-branching-strategy.md.

EOF
    exit 1
  fi
done

# Advisory only: an unconventional name is a nudge, not a blocked commit.
case "$branch" in
  feature/* | bugfix/* | hotfix/* | release/* | chore/* | docs/* | v[0-9]*.[0-9]*.[0-9]*) ;;
  *)
    printf "\n  ! Branch '%s' does not match the convention.\n" "$branch" >&2
    printf "    Expected: feature/* bugfix/* hotfix/* release/* chore/* docs/* or v1.2.3\n\n" >&2
    ;;
esac

exit 0
