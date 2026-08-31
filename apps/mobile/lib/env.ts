/**
 * The one sanctioned way to read an environment variable in the mobile app.
 *
 * Why this exists: React Native's own type declarations redeclare `process.env`
 * with an index signature returning `any`, which overrides @types/node. So every
 * bare `process.env['FOO']` is an `any` that the repo's no-unsafe-* rules will
 * (correctly) reject. Narrowing in one place beats annotating at every call site.
 *
 * Empty strings are treated as unset, because an unset variable in a CI
 * environment usually arrives as "" rather than undefined — and `if (value)` on
 * "" silently takes the wrong branch.
 */
export function readEnv(name: string): string | undefined {
  const value: unknown = process.env[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
