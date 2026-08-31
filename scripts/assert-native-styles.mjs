#!/usr/bin/env node
/**
 * Asserts that NativeWind actually compiled styles into the exported native
 * bundle.
 *
 * This is the mobile counterpart of scripts/assert-css-output.mjs, and it guards
 * the single nastiest failure mode in this stack: if
 * `jsxImportSource: 'nativewind'` goes missing from babel.config.js, or the
 * `nativewind/babel` preset is dropped, or `withNativeWind` loses its `input`
 * option, then EVERY className in the app silently becomes a no-op. No error, no
 * warning — the app just renders unstyled, and `expo export` still succeeds.
 *
 * Usage: node scripts/assert-native-styles.mjs apps/mobile/dist
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const distDir = process.argv[2] ?? 'apps/mobile/dist';

/** Recursively find the largest .hbc or .js bundle Expo emitted. */
function findBundles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findBundles(full));
    else if (/\.(hbc|js)$/.test(entry.name)) out.push(full);
  }
  return out;
}

let bundles;
try {
  bundles = findBundles(distDir)
    .map((path) => ({ path, size: statSync(path).size }))
    .sort((a, b) => b.size - a.size);
} catch (error) {
  console.error(`✖ Could not read ${distDir}: ${String(error)}`);
  console.error('  Run `pnpm --filter @repo/mobile exec expo export --platform all` first.');
  process.exit(1);
}

if (bundles.length === 0) {
  console.error(`✖ No .hbc or .js bundle found under ${distDir}.`);
  process.exit(1);
}

// Bundles may be Hermes bytecode, so read printable strings rather than parsing.
function bundleStrings(path) {
  try {
    return execFileSync('strings', [path], { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
  } catch {
    return '';
  }
}

const haystack = bundles
  .slice(0, 4)
  .map((bundle) => bundleStrings(bundle.path))
  .join('\n');

if (haystack.length === 0) {
  console.error('✖ Could not extract strings from the bundle (is `strings` available?).');
  process.exit(1);
}

const EXPECTED = [
  { name: 'NativeWind runtime', needle: 'react-native-css-interop' },
  { name: '--primary token', needle: '--primary' },
  { name: '--muted-foreground token', needle: '--muted-foreground' },
  { name: '--radius token', needle: '--radius' },
  { name: 'a compiled utility class', needle: 'bg-primary' },
  { name: 'app code (configureCore)', needle: 'configureCore' },
];

const missing = EXPECTED.filter(({ needle }) => !haystack.includes(needle));

if (missing.length > 0) {
  console.error(`✖ The native bundle is missing expected output (${String(missing.length)}):\n`);
  for (const { name, needle } of missing) console.error(`  - ${name} ("${needle}")`);
  console.error(
    '\nMost likely causes, in order:\n' +
      "  1. babel.config.js lost `jsxImportSource: 'nativewind'` or the\n" +
      "     'nativewind/babel' preset\n" +
      "  2. metro.config.js lost `withNativeWind(config, { input: './global.css' })`\n" +
      '  3. apps/mobile/global.css is missing or was not imported by app/_layout.tsx\n' +
      '  4. react-native-worklets/plugin is no longer LAST in the babel plugin list\n',
  );
  process.exit(1);
}

console.log(
  `✔ Native bundle contains the NativeWind runtime, the design tokens and compiled ` +
    `classes (${String(Math.round(bundles[0].size / 1024))} kB largest bundle).`,
);
