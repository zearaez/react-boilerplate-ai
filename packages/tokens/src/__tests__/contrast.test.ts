import { describe, expect, it } from 'vitest';

import {
  AA_LARGE_TEXT_OR_UI,
  AA_NORMAL_TEXT,
  contrastRatio,
  parseHslTriplet,
  relativeLuminance,
} from '../contrast';
import { colors, contrastPairs } from '../tokens';

describe('contrast maths', () => {
  it('parses HSL triplets across all six hue sectors', () => {
    expect(parseHslTriplet('0 0% 100%')).toEqual({ r: 1, g: 1, b: 1 });
    expect(parseHslTriplet('0 0% 0%')).toEqual({ r: 0, g: 0, b: 0 });
    expect(parseHslTriplet('0 100% 50%')).toEqual({ r: 1, g: 0, b: 0 });
    expect(parseHslTriplet('120 100% 50%')).toEqual({ r: 0, g: 1, b: 0 });
    expect(parseHslTriplet('240 100% 50%')).toEqual({ r: 0, g: 0, b: 1 });
  });

  it('rejects anything that is not a bare triplet', () => {
    // A full hsl() string here would silently break every opacity modifier in
    // the web app, so it must fail loudly.
    expect(() => parseHslTriplet('hsl(0 0% 100%)')).toThrow();
    expect(() => parseHslTriplet('#ffffff')).toThrow();
  });

  it('computes known luminances and ratios', () => {
    expect(relativeLuminance({ r: 1, g: 1, b: 1 })).toBeCloseTo(1, 5);
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 5);
    // Black on white is the WCAG maximum, 21:1.
    expect(contrastRatio('0 0% 0%', '0 0% 100%')).toBeCloseTo(21, 1);
    expect(contrastRatio('0 0% 50%', '0 0% 50%')).toBeCloseTo(1, 5);
  });
});

/**
 * Audit item 12.4. This is a token-level guarantee, not a rendered-UI one — it
 * proves the palette CAN meet AA, not that every screen does. Rendered checks
 * live in the axe smoke test (apps/web) and RNTL role/label queries (mobile).
 */
describe('WCAG AA — foreground/background token pairs', () => {
  for (const scheme of ['light', 'dark'] as const) {
    describe(scheme, () => {
      it.each(contrastPairs)('%s on %s meets AA for normal text', (fg, bg) => {
        const ratio = contrastRatio(colors[scheme][fg], colors[scheme][bg]);

        expect(
          ratio,
          `${scheme}: --${fg} on --${bg} is ${ratio.toFixed(2)}:1, below AA ${AA_NORMAL_TEXT}:1. ` +
            `Adjust the lightness in packages/tokens/src/tokens.ts.`,
        ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      });
    });
  }

  // The focus ring is a non-text UI component: WCAG 1.4.11 asks 3:1, not 4.5:1.
  //
  // `border` is deliberately NOT asserted. Stock shadcn borders sit at ~1.25:1
  // against the background by design — they are decorative separators, not
  // meaningful UI boundaries, and forcing them to 3:1 would produce a harsh
  // palette without an accessibility gain. Focus indication is carried by
  // `ring`, which IS asserted, because that one is load-bearing for keyboard
  // users.
  it.each(['light', 'dark'] as const)('%s: focus ring is visible against the page', (scheme) => {
    const ratio = contrastRatio(colors[scheme].ring, colors[scheme].background);
    expect(
      ratio,
      `${scheme}: --ring on --background is ${ratio.toFixed(2)}:1, below ${AA_LARGE_TEXT_OR_UI}:1. ` +
        `Keyboard focus would be hard to see.`,
    ).toBeGreaterThanOrEqual(AA_LARGE_TEXT_OR_UI);
  });
});
