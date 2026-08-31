/**
 * THE SINGLE SOURCE OF TRUTH FOR DESIGN TOKENS.
 *
 * Everything downstream is generated from this file:
 *   - packages/tokens/src/preset.ts  → the Tailwind preset both apps consume
 *   - apps/web/src/global.css        → generated, do not edit
 *   - apps/mobile/global.css         → generated, do not edit
 *
 * To change a colour: edit it HERE, then run `pnpm tokens:sync`.
 * A drift test fails CI if the generated files are out of date.
 *
 * Values are HSL channel triplets ("H S% L%") with no `hsl()` wrapper. That is
 * shadcn/ui's Tailwind-3 convention, and it is what makes an opacity modifier
 * like `bg-primary/90` possible: Tailwind expands the token to
 * `hsl(<triplet> / <alpha>)`. Keep the format — a full `hsl(...)` string here
 * silently breaks every opacity modifier in the web app.
 */

/**
 * 8px — the design system's `--radius-md`, the input/button radius, and the BASE the rest of
 * the scale is derived from in preset.ts. the design system's steps are 6 / 8 / 12 / 16, so
 * `sm` sits 2px below this and `lg`/`xl` 4px and 8px above.
 */
export const radius = '0.5rem';

/**
 * Type families — the design system's `--font-sans` and `--font-mono`.
 *
 * The mono family is not decoration: the console design sets emails, ids, role
 * labels and table headers in it, which is what stops a dense table of ids from
 * looking like prose.
 *
 * Quoted deliberately. An unquoted multi-word family name is legal CSS, but
 * Tailwind emits this list verbatim and the quotes remove all doubt.
 *
 * WEB ONLY, and that is the one place this package knowingly diverges by
 * platform: a font family name is inert until the font is loaded, and loading it
 * on native is `expo-font` work in apps/mobile. Naming it in the native preset
 * would silently fall back to the system face and look like a bug.
 */
export const fonts = {
  sans: [
    '"Plus Jakarta Sans"',
    'ui-sans-serif',
    'system-ui',
    '-apple-system',
    '"Segoe UI"',
    'sans-serif',
  ],
  mono: ['"JetBrains Mono"', 'ui-monospace', '"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
} as const;

/**
 * the design system's elevation scale: layered, low-spread, and cool-tinted rather than
 * Material's single dark-grey drop shadow.
 *
 * The colour comes from the `--shadow` role, so it is not written twice and dark
 * mode deepens automatically when that role flips to black — which is exactly
 * what the design system's dark theme does.
 *
 * WEB ONLY: React Native supports one shadow, not two layered ones, so these
 * cannot be expressed on native.
 */
export const shadows = {
  xs: '0 1px 2px hsl(var(--shadow) / 0.06)',
  sm: '0 1px 3px hsl(var(--shadow) / 0.08), 0 1px 2px -1px hsl(var(--shadow) / 0.06)',
  md: '0 4px 8px -2px hsl(var(--shadow) / 0.10), 0 2px 4px -2px hsl(var(--shadow) / 0.06)',
  lg: '0 12px 16px -4px hsl(var(--shadow) / 0.10), 0 4px 6px -2px hsl(var(--shadow) / 0.05)',
  xl: '0 20px 24px -4px hsl(var(--shadow) / 0.12), 0 8px 8px -4px hsl(var(--shadow) / 0.05)',
  '2xl': '0 28px 56px -12px hsl(var(--shadow) / 0.22)',
  /** The brand glow the design system's puts under a primary action. */
  primary: '0 8px 20px -6px hsl(var(--primary) / 0.40)',
  none: 'none',
} as const;

/** Semantic colour roles. Add a role here before using it in a className. */
export const colorRoles = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'border',
  'input',
  'ring',
  /**
   * The teal accent, for the brand mark only.
   *
   * A separate role rather than reusing `secondary`: in shadcn, `secondary` is a
   * muted neutral that Badge and Button both style themselves with, so putting
   * teal there would turn every secondary button teal. This is decorative and
   * carries no text, which is why it has no `-foreground` pair.
   */
  'brand-accent',
  /**
   * The brand tint — the design system's `--tint-primary`, a very light indigo wash.
   *
   * A role of its own because `accent` is a NEUTRAL grey in shadcn and every
   * vendored component uses it for hover states. The Console design marks the
   * current navigation item with a brand tint, not grey, and reusing `accent`
   * for that would either tint every hover state or leave the active item
   * indistinguishable from a hovered one. It carries text, so it has a
   * `-foreground` pair and a contrast assertion.
   */
  'primary-tint',
  'primary-tint-foreground',
  /**
   * The colour every shadow is tinted with — a role rather than a literal so the
   * `no raw colours` rule still holds for elevation, and so dark mode deepens
   * shadows by flipping ONE value instead of restating all seven.
   *
   * Carries no text, so no `-foreground` pair.
   */
  'shadow',
  /**
   * Status colours, as TINT SURFACES with a saturated foreground — the design system's
   * `--tint-*` / `--fg-*` pairs.
   *
   * Note the asymmetry with `destructive`, which is a SOLID fill with light text:
   * that one styles a destructive BUTTON, inherited from shadcn. These four
   * style state — a priority, a status, a decision — and
   * the design system's rule is that semantic colour appears as a soft tint plus saturated
   * text, "never raw saturated fills on large areas". A green button and a green
   * status pill are different things and should not share a token.
   */
  'success',
  'success-foreground',
  'warning',
  'warning-foreground',
  'info',
  'info-foreground',
  /**
   * The error TINT pair, and note it is not the same thing as `destructive`.
   *
   * `destructive` is a solid fill with light text on it — a delete button,
   * inherited from shadcn. `error` is a tint with saturated text on it, for STATE:
   * an urgent priority, a failed step, a rejected request. The Console design
   * uses both on the same screen, which is why they are two tokens.
   */
  'error',
  'error-foreground',
] as const;

export type ColorRole = (typeof colorRoles)[number];

export type ColorScale = Record<ColorRole, string>;

/**
 * Base palette: shadcn/ui "slate", from
 * https://ui.shadcn.com/r/colors/slate.json, so it matches the components
 * vendored into apps/web/src/components/ui.
 *
 * ONE DELIBERATE DEVIATION FROM STOCK SHADCN:
 *   light.destructive is `0 72% 45%`, not shadcn's `0 84.2% 60.2%`.
 *
 * Stock shadcn's light destructive gives only 3.66:1 against
 * destructive-foreground, which fails WCAG AA for normal-size text (4.5:1) —
 * and a destructive button's label is normal-size text. `0 72% 45%` measures
 * 5.5:1. The contrast test in src/__tests__/contrast.test.ts is what caught
 * this, and it will catch it again if someone "restores" the stock value.
 */
export const colors: { light: ColorScale; dark: ColorScale } = {
  light: {
    /*
     * the design system's `--surface-page` (#F8FAFC, neutral-50) — NOT white.
     *
     * The page being one step off white is what lets a white `card` read as a
     * raised surface without a shadow, which is how the Console design separates
     * its panels. With both at #FFFFFF every card boundary depended on its
     * border alone and the whole console looked flat.
     */
    background: '210 40% 98%',
    // the design system's `--text-primary` (#0F172A, neutral-900). Softer than shadcn's stock
    // near-black (#020817), which reads harsh against a slate page.
    foreground: '222.2 47.4% 11.2%',
    card: '0 0% 100%',
    'card-foreground': '222.2 47.4% 11.2%',
    popover: '0 0% 100%',
    'popover-foreground': '222.2 47.4% 11.2%',
    // Brand indigo — `--primary-600` (#5052D6), the design
    // system's "primary action" colour. 5.97:1 against white.
    primary: '239.1 62% 57.6%',
    'primary-foreground': '0 0% 100%',
    secondary: '210 40% 96.1%',
    'secondary-foreground': '222.2 47.4% 11.2%',
    muted: '210 40% 96.1%',
    'muted-foreground': '215.4 16.3% 46.9%',
    accent: '210 40% 96.1%',
    'accent-foreground': '222.2 47.4% 11.2%',
    // the design system's `--error-600` (#DC2626). 4.61:1 against destructive-foreground —
    // over AA, with less headroom than the 5.5:1 this repo used before, so do
    // not lighten it further. See the deviation note above the palette.
    destructive: '0 72.2% 50.6%',
    'destructive-foreground': '210 40% 98%',
    // the design system's `--border-subtle` (#E6EBF1, neutral-200).
    border: '212.7 28.2% 92.4%',
    input: '212.7 28.2% 92.4%',
    // The focus ring follows the brand, not the text colour — a near-black ring
    // on an indigo button reads as a rendering bug.
    ring: '239.1 62% 57.6%',
    // the design system's `--secondary-500` (#14B8A6).
    'brand-accent': '173.4 80.4% 40%',
    // the design system's `--tint-primary` (#F0F1FE, primary-50) and `--primary-700`
    // (#4143B8) — the exact pair the Console sidebar uses for the current item.
    'primary-tint': '235.7 87.5% 96.9%',
    'primary-tint-foreground': '239 47.8% 48.8%',
    // the design system's tints every light-mode shadow with slate-900 (#0F172A).
    shadow: '222.2 47.4% 11.2%',
    // the design system's `--tint-*` (the 50 step) with `--fg-*` (the 700 step) on top.
    success: '144.7 81% 95.9%',
    'success-foreground': '142.8 64.2% 24.1%',
    warning: '45 100% 96.1%',
    'warning-foreground': '26 90.5% 37.1%',
    info: '213.8 100% 96.9%',
    'info-foreground': '224.3 76.3% 48%',
    /*
     * `--tint-error` with `--error-700` on top, NOT the design system's own `--fg-error`
     * (#DC2626): that pairing measures 4.45:1 here and fails AA. The 700 step is
     * also what success, warning and info above already use, so this is the
     * consistent choice as well as the accessible one.
     */
    error: '5 85.7% 97.3%',
    'error-foreground': '0 73.7% 41.8%',
  },
  /*
   * the design system's own dark theme, not a guess.
   *
   * Where the design system's expresses a dark value as an alpha over the card surface
   * (borders at `rgba(255,255,255,0.12)`, the brand tint at 16%), it is
   * composited onto `--surface-card` #121A2B and stored as the resulting solid —
   * this file's format is a bare HSL triplet, which cannot carry alpha, and a
   * translucent border over a scrolling surface would shift colour anyway.
   */
  dark: {
    // `--surface-page` #080D1A (neutral-950) and `--surface-card` #121A2B. Two
    // distinct surfaces, where this repo previously had one value for both.
    background: '223.3 52.9% 6.7%',
    foreground: '216 41.7% 95.3%',
    card: '220.8 41% 12%',
    'card-foreground': '216 41.7% 95.3%',
    popover: '220.8 41% 12%',
    'popover-foreground': '216 41.7% 95.3%',
    // the design system's lightens the action colour in dark mode (`--primary-500`, #6366E8)
    // rather than reusing the light-mode value, which would go muddy on a dark
    // surface. 4.57:1 against white — over AA, but only just, so do not darken it.
    primary: '238.6 74.3% 64.9%',
    'primary-foreground': '0 0% 100%',
    // `--surface-raised` #18223A for the two subtle-surface roles, and
    // `--surface-sunken` #0D1424 for muted — so a raised control and a sunken
    // well are distinguishable, which one shared value could not express.
    secondary: '222.4 41.5% 16.1%',
    'secondary-foreground': '216 41.7% 95.3%',
    muted: '221.7 46.9% 9.6%',
    // `--text-secondary` #9FB0C5.
    'muted-foreground': '213.2 24.7% 69.8%',
    accent: '222.4 41.5% 16.1%',
    'accent-foreground': '216 41.7% 95.3%',
    /*
     * Deliberately NOT the design system's `--error-600`.
     *
     * the design system's defines no solid error FILL for dark mode — it pairs a low-alpha
     * tint with saturated `--fg-error` text instead. #DC2626 under a light
     * foreground measures 4.30:1, which fails AA, so the darker red this repo
     * already used stays. If a dark destructive button ever needs the brand red,
     * it needs a tint-plus-text treatment, not a lighter fill.
     */
    destructive: '0 62.8% 30.6%',
    'destructive-foreground': '210 40% 98%',
    // `rgba(255,255,255,0.12)` over #121A2B.
    border: '220.9 19.3% 22.4%',
    input: '220.9 19.3% 22.4%',
    ring: '238.6 74.3% 64.9%',
    // the design system's `--secondary-400` (#2DD0BC) — lifted for dark surfaces.
    'brand-accent': '172.6 64.4% 49.6%',
    // Brand at 16% over #121A2B, with `--primary-300` (#A3A6F5) on top — the
    // dark-mode form of the same current-item treatment.
    'primary-tint': '230 40.4% 20.4%',
    'primary-tint-foreground': '237.8 80.4% 80%',
    // the design system's dark shadows go near-black rather than staying slate — on a dark
    // surface a tinted shadow reads as a smudge.
    shadow: '0 0% 0%',
    // the design system's dark tints are the base colour at 14% over the card surface,
    // composited to solids here, with the lightened `--fg-*` on top.
    success: '180 42.9% 13.7%',
    'success-foreground': '141.9 69.2% 58%',
    warning: '27.3 12.4% 17.5%',
    'warning-foreground': '43.3 96.4% 56.3%',
    info: '218.3 49.5% 18.6%',
    'info-foreground': '213.1 93.9% 67.8%',
    // Red at 14% over the card surface reads slightly violet, because the
    // surface is blue-slate. That is the design system's own arithmetic, not a mistake.
    error: '310.6 21% 15.9%',
    'error-foreground': '0 90.6% 70.8%',
  },
};

/**
 * Pairs that must meet WCAG AA (4.5:1) in both schemes.
 * Asserted by src/__tests__/contrast.test.ts — audit item 12.4.
 */
export const contrastPairs: ReadonlyArray<readonly [ColorRole, ColorRole]> = [
  ['foreground', 'background'],
  ['card-foreground', 'card'],
  ['popover-foreground', 'popover'],
  ['primary-foreground', 'primary'],
  ['secondary-foreground', 'secondary'],
  ['accent-foreground', 'accent'],
  ['destructive-foreground', 'destructive'],
  ['muted-foreground', 'background'],
  // The current navigation item's label sits on the brand tint, so it is real
  // text on a real surface and belongs in this list.
  ['primary-tint-foreground', 'primary-tint'],
  // Status labels are text on a tint, so they carry the same obligation.
  ['success-foreground', 'success'],
  ['warning-foreground', 'warning'],
  ['info-foreground', 'info'],
  ['error-foreground', 'error'],
];

export const tokens = { radius, colors, colorRoles, contrastPairs } as const;
