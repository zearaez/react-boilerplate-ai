---
applyTo: 'apps/mobile/**'
---

# Mobile app rules

## Stack

- Expo SDK 57 — module versions are `~57.x`
- expo-router ~57.0.9 — auth guards are `<Stack.Protected>`, NOT a `router.replace()` effect
- NativeWind 4.2.6 — use `className`, never `StyleSheet.create`
- Jest 29 — `jest-expo@57` requires Jest **29**, not 30
- RNTL 14 — `render`, `renderHook` **and `fireEvent`** are async; await every one

## Do not

- Import `@react-navigation/*` — expo-router forked away in SDK 56, imports break at runtime
- Use `StyleSheet.create` — use NativeWind `className` only
- Add `watchFolders`, `resolver.nodeModulesPaths` to `metro.config.js` — Expo auto-detects pnpm monorepos
- Move `react-native-worklets/plugin` out of last position in `babel.config.js`
- Reach for another icon library — `lucide-react-native` is the only one in this repo
- Edit `apps/mobile/global.css` — it is generated from `packages/tokens/src/tokens.ts`;
  edit that (or `styles/extra.css`) and run `pnpm tokens:sync`

## Route files (`apps/mobile/app/`)

- Must have a **default export** — expo-router uses the file path as the route
- Non-route components go in `apps/mobile/components/`, never in `app/`
- Header options go in `_layout.tsx`, not per screen

## Styling

```tsx
// NativeWind className — no StyleSheet.create
<View className="flex-1 bg-background p-4">
  <Text className="text-foreground text-lg font-semibold">{t('title')}</Text>
</View>
```

## Testing

**There is no MSW here.** `msw/native` needs `MessageEvent`, `EventTarget` and
`BroadcastChannel`, none of which exist on Hermes, and its own docs call the
integration "potentially incomplete". So the split is:

- HTTP-level behaviour is tested in `@repo/core` under Vitest + `msw/node`
- mobile tests cover **rendering and interaction** — mock the `@repo/core` hooks
  and leave the shared schemas real. Stubbing a schema would make the test agree
  with itself instead of with its web counterpart.

Render through `renderScreen` from `apps/mobile/test/render.tsx`; it supplies the
`SafeAreaProvider` (with `initialMetrics` — the real one measures a native view
that does not exist in a test, so insets never resolve and every screen hangs) and
the `QueryClientProvider`.

Every variable a `jest.mock()` factory closes over must be named `mock*`. Jest
hoists `jest.mock()` above the file and refuses to run the suite otherwise. Type
`requireActual` explicitly, or spreading it leaks `any` through the mocked module.

```tsx
const mockMutate = jest.fn();

jest.mock('@repo/core', () => {
  const actual = jest.requireActual<typeof Core>('@repo/core');
  return { ...actual, useUpdateProfile: () => ({ mutate: mockMutate, isPending: false }) };
});

// RNTL 14 — render AND fireEvent are async
await renderScreen(<MyScreen />);
await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
```

Reference: `apps/mobile/app/__tests__/profile.test.tsx`.

`apps/mobile` has no coverage threshold — `jest.config.js` only sets
`collectCoverageFrom`. Tests are still expected; they are just not gated on a number.

## Five states — every list screen

Loading skeleton → error (with retry) → empty → items → FlatList `onEndReached`.
Copy from `apps/mobile/app/(app)/posts/`.
