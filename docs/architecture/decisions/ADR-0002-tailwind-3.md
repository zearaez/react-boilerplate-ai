# ADR-0002: Tailwind 3 on both platforms

**Status:** accepted · 2026-08-03

## Context

Tailwind 4 is current. NativeWind 4 — the stable NativeWind — is a Tailwind 3 tool.
NativeWind 5 targets Tailwind 4 but is `5.0.0-preview.4`, has no RC, and has an
open unanswered crash in its web target.

## Decision

Pin `tailwindcss` to **3.4.19 exactly**, on both apps. Do not mix majors.

## Why

NativeWind 4's declared peer range (`>3.3.0`) wrongly permits Tailwind 4; it
installs and then silently compiles nothing. Pinning exactly, plus an `overrides`
entry, makes that impossible.

Using Tailwind 4 on web and 3 on mobile was considered and rejected: two Tailwind
mental models in one repo is precisely how an agent ends up writing `@theme`
CSS-first syntax into a v3 `tailwind.config.ts`, which fails in a confusing way.
One version means one answer.

## Consequences

- No Oxide build speed, no CSS-first `@theme`, no P3 colours.
- The shadcn CLI cannot be used as-is (it emits v4); components are fetched from the
  Tailwind-3 registry path instead.
- Tailwind 4 and NativeWind 5 must be upgraded together, by hand, in one change.
