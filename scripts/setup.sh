#!/usr/bin/env bash
# One-command local setup (audit item 14.2).
#
# Checks the tool versions this repo actually requires, installs, generates the
# files that are generated, and tells you what to run next.

set -euo pipefail

REQUIRED_NODE_MAJOR=22
REQUIRED_NODE_MINOR=22

info()  { printf "\033[36m→\033[0m %s\n" "$1"; }
ok()    { printf "\033[32m✔\033[0m %s\n" "$1"; }
fail()  { printf "\033[31m✖\033[0m %s\n" "$1" >&2; exit 1; }

# --- node --------------------------------------------------------------------
command -v node >/dev/null 2>&1 || fail "Node is not installed. This repo needs >= ${REQUIRED_NODE_MAJOR}.${REQUIRED_NODE_MINOR}.0 (see .nvmrc)."

node_version="$(node --version | sed 's/^v//')"
node_major="${node_version%%.*}"
node_rest="${node_version#*.}"
node_minor="${node_rest%%.*}"

if [ "$node_major" -lt "$REQUIRED_NODE_MAJOR" ] ||
   { [ "$node_major" -eq "$REQUIRED_NODE_MAJOR" ] && [ "$node_minor" -lt "$REQUIRED_NODE_MINOR" ]; }; then
  fail "Node ${node_version} is too old. React Router 8 requires >= ${REQUIRED_NODE_MAJOR}.${REQUIRED_NODE_MINOR}.0. Run: nvm use"
fi
ok "Node ${node_version}"

# --- pnpm via corepack -------------------------------------------------------
# The version comes from the `packageManager` field, so nobody has to install a
# matching pnpm by hand.
if ! command -v corepack >/dev/null 2>&1; then
  fail "corepack is missing. It ships with Node >= 16; try 'npm i -g corepack'."
fi
corepack enable >/dev/null 2>&1 || true
ok "pnpm $(corepack pnpm --version)"

# --- env ---------------------------------------------------------------------
if [ ! -f .env ]; then
  cp .env.example .env
  ok "Created .env from .env.example (mocks are ON by default)"
else
  info ".env already exists — leaving it alone"
fi

# --- install -----------------------------------------------------------------
info "Installing dependencies…"
corepack pnpm install
ok "Dependencies installed"

# --- generated files ---------------------------------------------------------
info "Generating design-token CSS…"
corepack pnpm tokens:sync >/dev/null
ok "apps/web/src/global.css and apps/mobile/global.css are current"

# --- sanity ------------------------------------------------------------------
info "Checking for duplicate copies of singleton dependencies…"
node scripts/assert-single-version.mjs

cat <<'EOF'

  Setup complete.

    make web      web app at http://localhost:5173  (works with no backend)
    make mock     mock API at http://localhost:4000 (needed by the mobile app)
    make mobile   Expo dev server
    make check    the same gate CI runs

  Sign in with:  ada@example.com / password123

  Read AGENTS.md before writing code — it lists the pinned versions and the
  rules CI enforces.

EOF
