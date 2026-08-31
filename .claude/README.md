# `.claude/`

Repo-local agent configuration. `settings.json` is **committed** and shared;
`settings.local.json` is gitignored for personal overrides.

## Why the allowlist looks like that

Three deliberate choices in `settings.json`:

1. **The WebFetch allowlist mirrors the pinned doc domains in AGENTS.md.** The
   single most valuable thing an agent can do in this repo is read the real docs
   for a pinned version instead of writing from memory, so that must be
   friction-free. Fetching a random blog still prompts.

2. **`git push`, `eas build`, `eas submit`, `vercel` are denied.** They are
   irreversible or cost money. Everything up to the push is allowed.

3. **`npm install` and `yarn` are denied as a _correctness_ guard, not a safety
   one.** One stray `npm install` writes a `package-lock.json` and a hoisted
   `node_modules` that silently diverge from the pnpm workspace — and the symptom
   shows up much later as a duplicate React.

## Commands

| Command        | Does                                                        |
| -------------- | ----------------------------------------------------------- |
| `/check`       | Run the full gate and fix the code until it passes          |
| `/new-feature` | Scaffold a vertical slice with `pnpm gen`, then fill it in  |
| `/add-screen`  | Add one web page or one mobile screen, wired correctly      |
| `/audit`       | Run the OutCode project audit and diff against the baseline |

## Not enabled: the faa-cli PostToolUse hook

`faa scan` after every Edit/Write would catch oversized components and circular
deps at write time. It is left out because `import-x/no-cycle` already covers the
highest-value rule and a hook on every tool call has a real latency cost. If you
want it, the better placement is a step in the `static` CI job.
