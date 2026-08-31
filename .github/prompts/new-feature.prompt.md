---
mode: agent
description: Scaffold a complete vertical feature slice and fill in the real fields
---

Add a new feature end to end: ${input:Feature description (singular plural /api/path — e.g. comment comments /api/comments)}

## Step 1 — Read the reference first

`packages/core/src/features/posts/` is the canonical slice. Read it before
writing anything. Do not invent a different shape.

## Step 2 — Generate the skeleton

```bash
pnpm gen feature --args <singular> <plural> <apiPath>
pnpm fix
```

`pnpm fix` is required, not cosmetic — it sorts imports (eslint) and formats
(prettier), which are separate steps in this repo.

## Step 3 — Replace the placeholders

`packages/core/src/features/<plural>/schemas.ts` has stub fields. Replace them
with the real fields. Every downstream file — types, validation, both apps' forms
— derives from this file.

Update the fixture in `packages/mocks/src/fixtures/<plural>.ts` to match.

## Step 4 — Add strings

Every user-facing string belongs in `packages/core/src/i18n/locales/en.json` and
is accessed through `t()`. Raw JSX text fails lint.

## Step 5 — Verify

```bash
pnpm quality:check
```

The generated skeleton already passes. Any failure comes from steps 3 or 4.

## Non-negotiable constraints

- No `any`, no raw hex colours
- Mock handler paths start with `*/api/`
- If a shared hook or schema changed, update **both** apps in the same change
- See AGENTS.md for the complete rule set
