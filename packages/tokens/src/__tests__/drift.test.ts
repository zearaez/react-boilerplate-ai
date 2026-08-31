import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { nativePreset, webPreset } from '../preset';
import { renderGlobalCss } from '../render';
import { TARGETS } from '../targets';
import { colorRoles, colors } from '../tokens';

/**
 * Three assertions that keep one design-token source honest.
 *
 * This suite doubles as the "shadcn CLI clobbered our generated CSS" detector:
 * `shadcn add` occasionally appends keyframes to the file named in
 * components.json (`src/global.css`), which is generated. Assertion 1 catches
 * that and the failure message tells you where the change actually belongs.
 */
describe('token drift', () => {
  it.each(TARGETS)(
    '$outRel is up to date with tokens.ts',
    ({ target, extraAbs, extraRel, outAbs }) => {
      const expected = renderGlobalCss(target, extraRel, readFileSync(extraAbs, 'utf8'));
      const actual = readFileSync(outAbs, 'utf8');

      expect(
        actual,
        `Generated CSS is stale or was hand-edited.\n` +
          `Run \`pnpm tokens:sync\`. If you meant to change a colour, change it in ` +
          `packages/tokens/src/tokens.ts; if it is app-specific CSS, put it in ${extraRel}.`,
      ).toBe(expected);
    },
  );

  it('light and dark define exactly the same roles', () => {
    expect(Object.keys(colors.light).sort()).toEqual([...colorRoles].sort());
    expect(Object.keys(colors.dark).sort()).toEqual([...colorRoles].sort());
  });

  it('both presets expose every role, and only differ by the alpha placeholder', () => {
    const web = webPreset.theme.extend.colors;
    const native = nativePreset.theme.extend.colors;

    expect(Object.keys(web).sort()).toEqual([...colorRoles].sort());
    expect(Object.keys(native).sort()).toEqual([...colorRoles].sort());

    for (const role of colorRoles) {
      expect(web[role]).toBe(`hsl(var(--${role}) / <alpha-value>)`);
      expect(native[role]).toBe(`hsl(var(--${role}))`);
    }
  });

  it('neither app declares colours locally — the preset is the only source', () => {
    for (const { tailwindConfigRel } of TARGETS) {
      const source = readFileSync(
        new URL(`../../../../${tailwindConfigRel}`, import.meta.url),
        'utf8',
      );

      expect(
        /extend:\s*{[^}]*\bcolors\s*:/s.test(source),
        `${tailwindConfigRel} declares colours locally. Add the colour to ` +
          `packages/tokens/src/tokens.ts so both platforms get it.`,
      ).toBe(false);
    }
  });
});

/**
 * cn() is duplicated in both apps on purpose — the react-native-reusables CLI
 * writes and expects `~/lib/utils` and cannot be aliased the way shadcn's can,
 * and the two platforms will eventually want divergent extendTailwindMerge
 * class groups (web has hover:, native does not).
 *
 * Until that divergence is real, they must stay identical. If you legitimately
 * need them to differ, DELETE THIS TEST with a comment saying why.
 */
describe('cn() duplication', () => {
  it('is byte-identical modulo whitespace', () => {
    const normalise = (p: string) =>
      readFileSync(new URL(p, import.meta.url), 'utf8')
        .replace(/\s+/g, ' ')
        .trim();

    expect(normalise('../../../../apps/web/src/lib/utils.ts')).toBe(
      normalise('../../../../apps/mobile/lib/utils.ts'),
    );
  });
});
