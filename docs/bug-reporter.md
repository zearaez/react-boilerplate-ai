# In-app bug reporter

A floating button on every screen. Tap it and it screenshots what the user is
looking at, lets them annotate it (pen, arrow, box, blur, text), pick a severity
and type, and file a report — with the environment, the signed-in user, recent
console warnings and the last failed API call attached automatically.

It ships **enabled** on both platforms.

| Package                        | Version | Used by       | Docs                                                       |
| ------------------------------ | ------- | ------------- | ---------------------------------------------------------- |
| `@outcode/bug-reporter-core`   | 2.0.0   | `@repo/core`  | https://www.npmjs.com/package/@outcode/bug-reporter-core   |
| `@outcode/bug-reporter-web`    | 2.0.0   | `apps/web`    | https://www.npmjs.com/package/@outcode/bug-reporter-web    |
| `@outcode/bug-reporter-native` | 2.0.0   | `apps/mobile` | https://www.npmjs.com/package/@outcode/bug-reporter-native |

All three versions live in `pnpm-workspace.yaml` and must move together — `-web`
and `-native` both peer on `-core@^2` and pass its types across the boundary, so a
split major gives you two incompatible `BugReporterConfig` types.

## Where the code is

```
packages/core/src/features/bug-reporter/
  config.ts        createBugReporterConfig() — the shared decision about what a report contains
  repository.ts    ApiBugReporterRepository — the default backend
  api.ts           POST /api/bug-reports, zod-parsed
  schemas.ts       the response schema
  diagnostics.ts   console breadcrumbs + last failed API call

apps/web/src/components/bug-reporter.tsx        mountBugReporter() lifecycle
apps/mobile/components/bug-reporter.tsx         <BugReporterButton>
apps/mobile/app/_layout.tsx                     capture provider + capture view
packages/mocks/src/handlers/bug-reports.ts      the mock backend
```

Everything that decides **what a report contains** is in `@repo/core`, so the two
platforms cannot drift. Only the UI lifecycle is per-app.

## Where reports go

By default: `POST /api/bug-reports` on this app's own API, through the repo's axios
client — so a report inherits the base URL, the timeout and the `Authorization`
header the rest of the app uses. With mocks on, `packages/mocks` answers it, which
means the whole flow works after a clone with no backend and no credentials.

The library also offers a bare `apiUrl` option. **This repo deliberately does not
use it**: that path POSTs only title, description, screenshot and metadata, and
drops `context` and `diagnostics` on the floor — which are the entire difference
between "it's broken" and a report someone can act on. There is a test asserting
they survive.

### Filing to ClickUp

`@outcode/bug-reporter-core` ships `ClickUpBugReporterRepository`, wired through one
option:

```ts
createBugReporterConfig({
  appName: 'Repo Starter',
  platform: 'web',
  clickUp: {
    apiKey: '…',
    problemListId: '…',
    suggestionListId: '…',
  },
});
```

**Read this before you do.** A ClickUp API key passed to the widget is a key inside
a client bundle: it ships to every user, it is readable with devtools or `strings`
on the `.ipa`, and it carries the permissions of whoever minted it. That is why
it is not the default here, and why there is no `VITE_`/`EXPO_PUBLIC_` variable for
it — those are inlined into a shippable bundle, and this repo's rule against
putting secrets in them is not negotiable for a third-party API key.

Use it only for a build whose audience you control (a dev build, an internal UAT
channel), from a key scoped to nothing but the two target lists. For a public
build, keep `ApiBugReporterRepository` and proxy ClickUp behind your backend —
your endpoint holds the key, the client holds nothing.

### Your own backend

Implement the endpoint. The body is in `api.ts` (`BugReportBody`) and the response
only needs `{ "id": "BUG-001" }`, optionally `url`. Or replace the repository
entirely — anything satisfying `IBugReporterRepository` works:

```ts
class JiraRepository implements IBugReporterRepository {
  async createReport(params: CreateReportParams): Promise<BugReportResponse> {
    // …
    return { success: true, id: issue.key };
  }
}
```

`createReport` must **resolve** with `success: false` on failure, never reject — the
widget reads `success` to choose between an inline error and the offline retry
queue, and a throw escapes that and becomes an unhandled rejection while the user
watches a spinner.

## What every report carries

Automatic, no consent prompt, on both platforms:

- **From the library** — platform, OS, screen size, density, orientation, language,
  colour scheme, and on web the current route and connection type.
- **From `collectSharedContext()` in `config.ts`** — session status, the signed-in
  user's name/email/id, and the API base URL. Only the reporter's own identity, on
  their own report. Widening that is a privacy decision, not a config change.
- **From `diagnostics.ts`** — the last 25 console warnings/errors, and the last
  failed HTTP call.

That last one is wired in `packages/core/src/api/client.ts`, not by the library's
`captureFetch` option, which is switched **off**. The library can wrap global
`fetch`, but this repo talks to its API through axios, and axios uses
`XMLHttpRequest` in both browsers and Hermes — a fetch wrapper would record nothing
an axios call ever did. The response interceptor calls `recordFailedRequest()`
instead.

## Platform notes

### Web

`mountBugReporter()` is framework-agnostic vanilla DOM: it appends its own element
to `document.body`, so `<BugReporter />` renders `null` and only manages lifecycle.
That is not an implementation detail to tidy up — it is how the widget reaches the
browser's top layer, so it survives modal libraries that set
`body { pointer-events: none }` (Radix, MUI, Headless UI, shadcn) and host overlays
at `z-index: 2147483647`. When your app opens a modal `<dialog>` or marks the page
`inert`, the widget relocates into that subtree while it is open.

The one visible limitation: if a host modal is **transformed** (common with
animation libraries), `position: fixed` resolves against the modal, so the button
pins to the modal's corner rather than the viewport's.

It is mounted in `main.tsx` beside `<RouterProvider>`, not inside `<AppShell>` —
AppShell only wraps authenticated routes, and a reporter that cannot report the
login screen is missing the screens most worth reporting.

The offline retry queue uses `localStorage`, which the library defaults to on its
own. This repo's `no-restricted-globals` ban on `localStorage` is about **auth
tokens** and applies to code we write; it does not reach into the library. Note the
queue holds screenshots, so it competes for the ~5 MB origin quota.

### Mobile

**Screen capture needs a dev build.** `react-native-view-shot` (5.1.0, pinned by
Expo SDK 57) ships native code that is not in the Expo Go sandbox, where capture
silently returns nothing. `pnpm dev:mobile` already assumes a dev build.

Capture is **view-based** — it snapshots the view handed to it, which is why
`app/_layout.tsx` wraps the whole navigator in `<BugReporterScreenCaptureView>`.
Two consequences:

- `<AppBugReporter />` is mounted **outside** that view, so the button itself stays
  out of the screenshot.
- A `<Modal>` lives in its own native window **outside** the captured view, so a
  report filed over a modal shows the screen behind it. Either describe the dialog
  in the report, or wrap the modal's own content in a capture view.

The button is mounted **last** inside the provider. It sits at `elevation: 24` —
the Material ceiling dialogs and menus use — and mounting order breaks the tie at
equal elevation. A host `<Modal>` is the case no styling wins: React Native presents
each Modal in its own native window above the whole app. To report from inside your
own modal, drive the button by ref:

```tsx
const reporter = useRef<BugReporterButtonHandle>(null);

<BugReporterButton ref={reporter} config={config} />
// inside your modal:
<Button onPress={() => reporter.current?.open()} title={t('bugReporter.button')} />
```

There is **no offline retry queue on mobile**. The queue wants an
`AsyncStorage`-shaped adapter, and this app persists only the session, in
`expo-secure-store` — whose 2 KB-per-value limit a base64 screenshot blows through
instantly. A failed report reports its failure rather than being silently kept.

## Theming

`theme: 'indigo'` by default; `'noir'` and `'mint'` also ship. The reporter is
**not** themed from `@repo/tokens`, because `@repo/core` may not import it (the
package boundary in `packages/config/eslint/logic-only.js`) and the reporter's
16-token palette is not the app's Tailwind palette. To match your brand, pass a
partial override from an **app**, where tokens are importable:

```ts
createBugReporterConfig({ appName, platform, theme: { accent: '…', onAccent: '…' } });
```

Raw hex there will trip `no-restricted-syntax` — add the colour to
`packages/tokens/src/tokens.ts` first and reference it, which is the point of the
rule.

## Turning it off

| Platform | Variable                                 | Effect       |
| -------- | ---------------------------------------- | ------------ |
| Web      | `VITE_BUG_REPORTER_ENABLED=false`        | Not mounted. |
| Mobile   | `EXPO_PUBLIC_BUG_REPORTER_ENABLED=false` | Not mounted. |

Only the exact string `'false'` disables it. The import stays static either way, so
this gates mounting, not bundle size.

## Testing

- `packages/core/src/features/bug-reporter/__tests__/` — the submit path against
  `msw/node`: ticket id, context/diagnostics survival, the failure contract, the
  schema-mismatch path, unauthenticated reports, and the axios→diagnostics wiring.
- `apps/web/src/components/__tests__/bug-reporter.test.tsx` — mount, unmount, and
  the StrictMode mount→destroy→mount sequence producing exactly one button.
- `apps/mobile/components/__tests__/bug-reporter.test.tsx` — the button renders
  with a translated label. The flow is not driven here: capture is a native module
  jest-expo does not have.

Filing a report titled **`report-fail`** always returns 500 from the mock — the
counterpart to the `post-fail` post id, so the error path is reachable in a demo
without unplugging the network. `receivedBugReports()` from `@repo/mocks` returns
what was filed.
