---
mode: agent
description: Write a focused test for the specified code
---

Write a test for: ${input:What to test (hook, component, api function, or schema)}

## Test location

| What you are testing       | Test file location                             |
| -------------------------- | ---------------------------------------------- |
| `@repo/core` hook or api   | `packages/core/src/features/<name>/__tests__/` |
| `@repo/core` utility       | `packages/core/src/__tests__/`                 |
| Web component or page      | `apps/web/src/**/__tests__/` or `*.test.tsx`   |
| Mobile component or screen | `apps/mobile/**/__tests__/` or `*.test.tsx`    |
| Token drift / CSS sync     | `packages/tokens/src/__tests__/`               |

## Core hooks

Reference: `packages/core/src/features/posts/__tests__/hooks.test.ts`

Use the `renderHookWithQuery` helper from `packages/core/src/test/render-hook.tsx`
— it supplies the QueryClientProvider and returns the client, so tests never
hand-roll a wrapper. It is **synchronous**: core runs under
`@testing-library/react` 16, not RNTL, so there is nothing to await.

```ts
const { result, queryClient } = renderHookWithQuery(() => usePostsQuery(params));
await waitFor(() => {
  expect(result.current.isSuccess).toBe(true);
});
```

Requests are served by the MSW handlers in `packages/mocks/src/handlers/`, already
wired up in `packages/core/src/test/setup.ts`. Import `server` from that file and
`server.use(...)` to override a single endpoint for one test — `afterEach` resets
the handlers and the mock db for you.

Sign the caller in with `authenticateTestUser()` from
`packages/core/src/test/authenticate.ts` before hitting anything the mock guards.

## Mobile screens

RNTL 14 made `render` **and** `fireEvent` async — await both. Use the
`renderScreen` helper from `apps/mobile/test/render.tsx`.

There is no MSW on native (`msw/native` needs Hermes globals that do not exist),
so mock the `@repo/core` hooks instead and leave the shared schemas real. Every
variable a `jest.mock()` factory closes over must be named `mock*`, or Jest
refuses to run the file. Reference: `apps/mobile/app/__tests__/profile.test.tsx`.

## Web components

Use Vitest + `@testing-library/react`. Query by role and accessible name, not by
test-id unless there is no semantic alternative. Render through
`apps/web/src/test/render.tsx` — `renderWithProviders` for a component,
`renderRoute` for a page that reads route params.

## Coverage

The coverage thresholds are in `vitest.config.ts`, and they cover `@repo/core`,
`@repo/tokens` and `apps/web`. Do not lower them — write the test.

`apps/mobile` has **no** coverage threshold: `jest.config.js` only sets
`collectCoverageFrom`. Mobile tests are still required, they are simply not gated
on a number.

## After writing

```bash
pnpm test          # core + web
pnpm test:mobile   # mobile
```

Report what the test covers and confirm it passes.
