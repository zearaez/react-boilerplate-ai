---
description: Scaffold a complete vertical slice, then fill in the real fields
argument-hint: <singular> <plural> <apiPath>
---

Add a new feature end to end: $ARGUMENTS

Do it in this order.

1. **Read the reference first.** `packages/core/src/features/posts/` is the
   canonical slice — schemas, api, keys, hooks (including the optimistic update
   with rollback), and its tests. Do not invent a different shape.

2. **Generate the skeleton.** Do not hand-write these files:

   ```bash
   pnpm gen feature --args <singular> <plural> <apiPath>
   ```

   Singular and plural are kebab-case, e.g. `comment comments /api/comments`.

   Then run `pnpm fix`. This is required, not cosmetic: it runs both `eslint --fix`
   (appended imports need re-sorting) and `prettier --write`, which are separate
   steps in this repo.

3. **Replace the placeholders.** The generated
   `packages/core/src/features/<plural>/schemas.ts` has a `title` /`createdAt`
   stub. Put the real fields there — types, validation and both apps' forms all
   derive from it. Then make the fixture in
   `packages/mocks/src/fixtures/<plural>.ts` match.

4. **Add the strings.** Every user-facing string goes in
   `packages/core/src/i18n/locales/en.json` and is read through `t()`. Raw JSX
   text fails lint in feature and screen files.

5. **Verify.** `pnpm quality:check`. The generated slice already passes, so any
   failure is from step 3 or 4.

Constraints that are not negotiable: no `any`, no raw hex colours, mock handler
paths start with `*/api/`, and if you touch a shared hook you update **both** apps
in the same change. See AGENTS.md.
