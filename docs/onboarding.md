# Onboarding — day one

## 1. Get it running (15 minutes)

```bash
nvm use          # Node 22.22+
make setup
make check       # confirm a clean clone passes the gate
```

Then, in two terminals:

```bash
make web         # http://localhost:5173
make mock        # required only by the mobile app
```

Sign in with **anisha@example.com / password123**.

Do this before reading anything else. If `make check` fails on a fresh clone, that is
a bug in the template — report it rather than working around it.

## 2. Look at the demo (20 minutes)

Walk the app: sign in, page through the posts list, open one, create one, edit one.

Then **edit the post titled "Editing this post always fails (on purpose)"**. Watch
the change apply instantly and snap back. That is the optimistic-update rollback in
`useUpdatePost`, and it is the most important pattern in the repo.

Now read the code behind what you just used, in this order:

1. `packages/core/src/features/posts/schemas.ts`
2. `.../api.ts`
3. `.../keys.ts`
4. `.../hooks.ts` — the annotated version of every pattern
5. `apps/web/src/features/posts/posts-list-page.tsx`
6. `apps/mobile/app/(app)/index.tsx` — the same screen, other platform

[patterns.md](patterns.md) is the guided tour of exactly those files.

## 3. Read the rules (20 minutes)

[AGENTS.md](../AGENTS.md). It is written for agents but it is the shortest accurate
statement of how this repo works, and everything in it is enforced by a check rather
than by convention.

The two things most likely to surprise you:

- **Versions are pinned away from `latest` on purpose** — TypeScript, Tailwind, Jest
  and Babel are all deliberately behind. [versions.md](versions.md) says why for each.
- **There are zero `eslint-disable` comments**, and that is a rule, not an accident.

## 4. Your first change

Add a feature with the generator rather than by hand:

```bash
pnpm gen feature --args tag tags /api/tags
pnpm fix
pnpm quality:check
```

Read the diff. That is the shape every feature takes.

Then revert it and do something real, on a branch:

```bash
git switch -c feature/your-thing
```

Note the branch flow: feature branches come from a **version** branch, not from
`develop`. [development-workflow.md](development-workflow.md).

## 5. Access you will need

- GitHub repo access and membership of the team in `.github/CODEOWNERS`
- Expo organisation access, for mobile builds
- Vercel project access, for web deploys
- Sentry project access
- The `.env` values for uat/production, from 1Password — never from a colleague's
  screen share

## Where to ask

Check [troubleshooting.md](troubleshooting.md) and
[known-issues.md](known-issues.md) first; between them they cover most of what goes
wrong in the first week. Then ask in the team channel with the exact error text.
