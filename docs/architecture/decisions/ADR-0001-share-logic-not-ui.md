# ADR-0001: Share logic, not UI

**Status:** accepted · 2026-08-03

## Context

The repo needs a web app and a mobile app that stay consistent. The obvious
approach is a shared component library rendering on both platforms via NativeWind
and `react-native-web`.

## Decision

Share logic in `@repo/core`. Each app owns its own components. `react-native-web`
is not a dependency.

## Why

NativeWind on Vite is unsupported territory: it works only via `react-native-web`'s
undocumented `$$css` escape hatch, NativeWind closed "not working on vite" as
`wontfix`, has no Vite in CI, and has already shipped a regression where classes
survived `vite dev` and disappeared from `vite build`. Its least-tested area —
portals and measured-position overlays — is what real apps need most.

The deciding factor is who debugs the failure. In a repo where an agent writes most
of the code, a silent styling failure in a bundler seam is far more expensive than
duplicated markup.

## Consequences

- Markup is written twice; behaviour is not.
- Consistency comes from shared hooks, shared zod schemas, shared tokens, and the
  generator emitting both platforms together.
- NativeWind runs only on Metro, its supported path.
- If NativeWind 5 stabilises with a real Vite story, this is worth revisiting — the
  seam is small because no app imports the other's components.
