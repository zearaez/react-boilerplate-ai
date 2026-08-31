#!/usr/bin/env node
/**
 * Fails if more than one resolved version of a singleton package exists
 * anywhere in the workspace.
 *
 * Why this exists: `nodeLinker: hoisted` plus a monorepo makes duplicate copies
 * easy to create and nearly impossible to diagnose from the symptom. Two Reacts
 * surface as "Invalid hook call" with a stack trace pointing into
 * @tanstack/react-query; two react-querys surface as "No QueryClient set".
 * Both cost hours for a human and are effectively unsolvable for an agent.
 *
 * Run: node scripts/assert-single-version.mjs
 */
import { execFileSync } from 'node:child_process';

const SINGLETONS = ['react', 'react-dom', '@tanstack/react-query', 'tailwindcss', 'typescript'];

/** Recursively collect name@version pairs from `pnpm ls --json` output. */
function collect(node, found) {
  for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    for (const [name, info] of Object.entries(node[field] ?? {})) {
      if (!info || typeof info !== 'object') continue;
      if (SINGLETONS.includes(name) && typeof info.version === 'string') {
        (found[name] ??= new Set()).add(info.version);
      }
      collect(info, found);
    }
  }
}

let raw;
try {
  raw = execFileSync(
    'pnpm',
    ['ls', '--recursive', '--depth', 'Infinity', '--json', ...SINGLETONS],
    { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] },
  );
} catch {
  console.error('✖ Could not run `pnpm ls`. Run `pnpm install` first.');
  process.exit(1);
}

const found = {};
for (const project of JSON.parse(raw)) collect(project, found);

const duplicated = Object.entries(found).filter(([, versions]) => versions.size > 1);

if (duplicated.length > 0) {
  console.error('✖ Duplicate versions of singleton packages found:\n');
  for (const [name, versions] of duplicated) {
    console.error(`  ${name}: ${[...versions].sort().join(', ')}`);
  }
  console.error(
    '\nAdd or correct the pin in the `pnpm.overrides` block of the root package.json,' +
      '\nthen run `pnpm install`. See docs/versions.md for why each singleton is pinned.',
  );
  process.exit(1);
}

const summary = SINGLETONS.map((name) => {
  const versions = found[name];
  return `${name}@${versions ? [...versions][0] : 'not installed'}`;
}).join('  ');

console.log(`✔ Single version of each singleton:\n  ${summary}`);
