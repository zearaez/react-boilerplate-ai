# ADR-0003: TypeScript 6.0.3, not 7

**Status:** accepted · 2026-08-03

## Context

TypeScript 7 is the Go-native port and is much faster.

## Decision

Pin `typescript` to **6.0.3 exactly**.

## Why

TS 7 exposes no compiler API — its `"."` export is a version stub and there is no
`tsserver` bin. `@typescript-eslint/typescript-estree` imports the compiler and
calls `ts.createProgram`, so type-aware linting does not degrade against TS 7, it
fails. No typescript-eslint release supports it, including canary (peer:
`>=4.8.4 <6.1.0`), and the blockers include async parser support in ESLint core.

Losing `no-floating-promises`, `no-misused-promises`, `await-thenable` and
`no-unnecessary-condition` costs far more than a slow `tsc` — those are the rules
that catch agent-written async mistakes. This repo's own build already found real
bugs through them.

The pin is exact rather than `^6.0.0` because 6.1.0 would leave the peer range and
silently disable every one of those rules.

## Consequences

- Slower typechecks than TS 7 would give (still under a second here).
- Revisit only when a typescript-eslint release raises the cap — not when TS 7.1
  ships, which is necessary but not sufficient.
