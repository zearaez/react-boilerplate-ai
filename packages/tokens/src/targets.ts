import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Target } from './render';

const here = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(here, '../../..');

export interface TargetPaths {
  target: Target;
  /** Repo-relative path of the app's hand-written CSS (the generator's input). */
  extraRel: string;
  /** Repo-relative path of the generated file (the generator's output). */
  outRel: string;
  extraAbs: string;
  outAbs: string;
  /** Repo-relative path of the app's tailwind config, checked by the drift test. */
  tailwindConfigRel: string;
}

/** Single place that knows which files `pnpm tokens:sync` owns. */
export const TARGETS: readonly TargetPaths[] = (
  [
    {
      target: 'web',
      extraRel: 'apps/web/src/styles/extra.css',
      outRel: 'apps/web/src/global.css',
      tailwindConfigRel: 'apps/web/tailwind.config.ts',
    },
    {
      target: 'native',
      extraRel: 'apps/mobile/styles/extra.css',
      outRel: 'apps/mobile/global.css',
      tailwindConfigRel: 'apps/mobile/tailwind.config.ts',
    },
  ] as const
).map((t) => ({
  ...t,
  extraAbs: join(repoRoot, t.extraRel),
  outAbs: join(repoRoot, t.outRel),
}));
