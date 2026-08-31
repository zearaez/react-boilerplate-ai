import animate from 'tailwindcss-animate';

import { webPreset } from '@repo/tokens/preset';

import type { Config } from 'tailwindcss';

/**
 * Colours, radii and dark-mode strategy all come from the preset, which is
 * generated from packages/tokens/src/tokens.ts.
 *
 * DO NOT add `theme.extend.colors` here — a drift test asserts this file
 * declares no colours locally, because a colour that exists on web but not on
 * mobile is exactly the divergence the token package exists to prevent.
 */
export default {
  presets: [webPreset],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [animate],
} satisfies Config;
