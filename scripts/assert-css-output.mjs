#!/usr/bin/env node
/**
 * Asserts that the PRODUCTION CSS bundle actually contains the design tokens and
 * a representative set of utility classes.
 *
 * Why this exists as its own gate: Tailwind and the bundler both remove CSS they
 * believe is unused, and both have been wrong here in ways that only show up in
 * a real build.
 *
 *   - Tailwind purged the entire `.dark` palette when it lived inside
 *     `@layer base` and no `dark:` variant existed yet. Dev was fine.
 *   - NativeWind/Rolldown have a documented history of tree-shaking away class
 *     registrations so that styles survive `vite dev` and disappear in
 *     `vite build` (nativewind PR #1515).
 *
 * A unit test cannot catch either. Run this after `vite build`.
 *
 * Usage: node scripts/assert-css-output.mjs apps/web/dist
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const distDir = process.argv[2] ?? 'apps/web/dist';
const assetsDir = join(distDir, 'assets');

let css;
try {
  const files = readdirSync(assetsDir).filter((name) => name.endsWith('.css'));
  if (files.length === 0) throw new Error('no .css emitted');
  css = files.map((name) => readFileSync(join(assetsDir, name), 'utf8')).join('\n');
} catch (error) {
  console.error(`✖ Could not read CSS from ${assetsDir}: ${String(error)}`);
  console.error('  Run `pnpm --filter @repo/web build` first.');
  process.exit(1);
}

/** Light-mode token values, which must always be present. */
const LIGHT_TOKENS = ['--background:0 0% 100%', '--primary:222.2 47.4% 11.2%'];

/** Dark-mode token values. These are the ones Tailwind silently purged. */
const DARK_TOKENS = ['--background:222.2 84% 4.9%', '--muted-foreground:215 20.2% 65.1%'];

/** Utilities the vendored shadcn components depend on. */
const UTILITIES = ['.bg-primary{', '.bg-destructive{', '.text-muted-foreground{', '.border-input{'];

/**
 * Patterns rather than literals, where the minifier normalises the value
 * (`0.5rem` becomes `.5rem`) or where `@apply` inlines a utility so no standalone
 * class is emitted.
 */
const PATTERNS = [
  { name: '--radius token', re: /--radius:0?\.5rem/ },
  {
    name: 'focus ring wired to the --ring token (via @apply in styles/extra.css)',
    re: /--tw-ring-color:hsl\(var\(--ring\)/,
  },
];

/** The opacity modifier only works if the preset keeps `<alpha-value>`. */
const ALPHA_MODIFIER = 'hsl(var(--primary) / .9)';

const failures = [];

for (const token of LIGHT_TOKENS) {
  if (!css.includes(token)) failures.push(`missing light token: ${token}`);
}
for (const token of DARK_TOKENS) {
  if (!css.includes(token)) {
    failures.push(
      `missing DARK token: ${token} — is it inside @layer base again? See packages/tokens/src/render.ts`,
    );
  }
}
for (const utility of UTILITIES) {
  if (!css.includes(utility)) failures.push(`missing utility: ${utility}`);
}
for (const { name, re } of PATTERNS) {
  if (!re.test(css)) failures.push(`missing ${name} (expected to match ${String(re)})`);
}
if (!css.includes(ALPHA_MODIFIER)) {
  failures.push(
    `opacity modifiers did not compile (expected "${ALPHA_MODIFIER}") — check that ` +
      `webPreset still emits "<alpha-value>" in packages/tokens/src/preset.ts`,
  );
}
if (!/\.dark\s*\{/.test(css)) {
  failures.push('no .dark selector in the bundle — the dark palette was purged');
}

if (failures.length > 0) {
  console.error(`✖ Production CSS is missing expected output (${String(failures.length)}):\n`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `✔ Production CSS contains both palettes, the shadcn utilities, and working ` +
    `opacity modifiers (${String(Math.round(css.length / 1024))} kB).`,
);
