#!/usr/bin/env tsx
/**
 * Writes apps/web/src/global.css and apps/mobile/global.css from
 * packages/tokens/src/tokens.ts.
 *
 * Run: pnpm tokens:sync
 *
 * Deliberately NOT a Turborepo task: its outputs live outside this package, so
 * declaring them as `outputs` would give turbo an incorrect cache footprint and
 * produce stale hits.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';

import { renderGlobalCss } from '../src/render';
import { TARGETS, repoRoot } from '../src/targets';

let changed = 0;

for (const { target, extraRel, extraAbs, outRel, outAbs } of TARGETS) {
  let extra: string;
  try {
    extra = readFileSync(extraAbs, 'utf8');
  } catch {
    console.error(`✖ Missing input: ${extraRel}`);
    console.error('  Every target needs a styles/extra.css, even if it is empty.');
    process.exit(1);
  }

  const next = renderGlobalCss(target, extraRel, extra);

  let current: string | null = null;
  try {
    current = readFileSync(outAbs, 'utf8');
  } catch {
    /* first run */
  }

  if (current === next) {
    console.log(`· ${outRel} already up to date`);
    continue;
  }

  writeFileSync(outAbs, next, 'utf8');
  changed += 1;
  console.log(`✔ wrote ${relative(repoRoot, outAbs)}`);
}

console.log(changed === 0 ? '\nNothing to do.' : `\n${changed} file(s) regenerated.`);
