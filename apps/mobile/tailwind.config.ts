import nativewindPreset from 'nativewind/preset';

import { nativePreset } from '@repo/tokens/preset';

import type { Config } from 'tailwindcss';

/**
 * NativeWind 4 requires Tailwind 3 and a `tailwind.config` file. Tailwind 4's
 * CSS-first `@theme` syntax does NOT work here — see AGENTS.md.
 *
 * `nativePreset` omits the `<alpha-value>` placeholder that the web preset uses;
 * see packages/tokens/src/preset.ts for why.
 *
 * DO NOT add `theme.extend.colors` here — a drift test asserts this file
 * declares no colours locally.
 */
export default {
  presets: [nativewindPreset, nativePreset],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    // Relative path, NOT through the node_modules symlink: Tailwind's globbing
    // does not reliably traverse symlinked directories.
    '../../packages/core/src/**/*.{ts,tsx}',
  ],
} satisfies Config;
