import { colorRoles, fonts, radius, shadows } from './tokens';

import type { Config } from 'tailwindcss';

/**
 * Tailwind 3 presets generated from tokens.ts.
 *
 * There are TWO presets on purpose, and the difference is one string:
 *
 *   web    → hsl(var(--primary) / <alpha-value>)
 *   native → hsl(var(--primary))
 *
 * `<alpha-value>` is what makes opacity modifiers (`hover:bg-primary/90`) work.
 * The vendored shadcn components rely on those modifiers, so web needs it.
 * NativeWind's style parser is not confirmed to handle the substituted
 * `hsl(H S% L% / 1)` form, and the vendored react-native-reusables components
 * express the same intent with `active:opacity-90` instead — so native omits
 * it rather than betting on parser behaviour.
 *
 * Both are derived from the same `colorRoles`, so a role can never exist on one
 * platform and not the other. The drift test enforces that.
 */
function colorMap(withAlpha: boolean): Record<string, string> {
  return Object.fromEntries(
    colorRoles.map((role) => [
      role,
      withAlpha ? `hsl(var(--${role}) / <alpha-value>)` : `hsl(var(--${role}))`,
    ]),
  );
}

/**
 * the design system's radius scale, derived from the single `--radius` base (8px).
 *
 * Note this SHIFTS the stock shadcn mapping, deliberately. shadcn treats
 * `--radius` as `lg` and steps down from it; the design system's 8px is the input/button
 * radius (`md`) and cards are one step LARGER at 12px. Keeping shadcn's mapping
 * would have made every card 8px where the design asks for 12px, and the
 * vendored components — which reach for `rounded-md` on controls and
 * `rounded-lg` on cards — land on the right value under this arrangement
 * without being touched.
 */
const sharedTheme = {
  borderRadius: {
    sm: `calc(var(--radius) - 2px)`,
    md: 'var(--radius)',
    lg: `calc(var(--radius) + 4px)`,
    xl: `calc(var(--radius) + 8px)`,
  },
} as const;

/**
 * Preset for apps/web (Vite + shadcn/ui).
 *
 * `fontFamily` and `boxShadow` are here rather than in `sharedTheme` because
 * neither survives the trip to native: a family name is inert until the font is
 * loaded (expo-font work), and React Native cannot express a two-layer shadow.
 * See the comments on `fonts` and `shadows` in tokens.ts.
 */
export const webPreset = {
  darkMode: 'class',
  content: [],
  theme: {
    extend: {
      colors: colorMap(true),
      fontFamily: { sans: [...fonts.sans], mono: [...fonts.mono] },
      boxShadow: { ...shadows },
      ...sharedTheme,
    },
  },
} satisfies Config;

/** Preset for apps/mobile (Expo + NativeWind 4 + react-native-reusables). */
export const nativePreset = {
  darkMode: 'class',
  content: [],
  theme: {
    extend: {
      colors: colorMap(false),
      ...sharedTheme,
    },
  },
} satisfies Config;

export { radius };
