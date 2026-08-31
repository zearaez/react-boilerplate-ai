/**
 * NativeWind 4.2.6 ships `dist/tailwind/index.d.ts` as an EMPTY file and has no
 * `exports` entry for `./preset`, so `import nativewindPreset from
 * 'nativewind/preset'` fails with "File ... is not a module".
 *
 * Declaring the module here is the minimal fix. The alternatives are worse:
 * `require()` trips no-require-imports, and `@ts-expect-error` would suppress
 * real errors too.
 *
 * Delete this file once NativeWind ships types for the preset (check on any
 * nativewind upgrade — see docs/known-issues.md).
 */
declare module 'nativewind/preset' {
  import type { Config } from 'tailwindcss';

  const preset: Config;
  export default preset;
}
