/**
 * Minimal WCAG 2.1 contrast maths over HSL channel triplets.
 * Exists so audit item 12.4 ("colour contrast meets WCAG AA") is an assertion
 * rather than a claim. No dependency — this is ~40 lines of arithmetic.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Parses a token triplet like "222.2 84% 4.9%" into 0-1 RGB. */
export function parseHslTriplet(triplet: string): Rgb {
  const match = /^\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*$/.exec(triplet);
  if (!match) throw new Error(`Not an HSL channel triplet: "${triplet}"`);

  const h = Number(match[1]);
  const s = Number(match[2]) / 100;
  const l = Number(match[3]) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const m = l - c / 2;

  const [r1, g1, b1] =
    hp < 1
      ? [c, x, 0]
      : hp < 2
        ? [x, c, 0]
        : hp < 3
          ? [0, c, x]
          : hp < 4
            ? [0, x, c]
            : hp < 5
              ? [x, 0, c]
              : [c, 0, x];

  return { r: r1 + m, g: g1 + m, b: b1 + m };
}

/** WCAG relative luminance. */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two token triplets. 1 = identical, 21 = max. */
export function contrastRatio(tripletA: string, tripletB: string): number {
  const a = relativeLuminance(parseHslTriplet(tripletA));
  const b = relativeLuminance(parseHslTriplet(tripletB));
  const [light, dark] = a > b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
}

/** WCAG AA for normal-size text. */
export const AA_NORMAL_TEXT = 4.5;
/** WCAG AA for large text (>=24px, or >=18.66px bold) and non-text UI components. */
export const AA_LARGE_TEXT_OR_UI = 3;
