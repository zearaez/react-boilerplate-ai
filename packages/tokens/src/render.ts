import { colorRoles, colors, radius } from './tokens';

export type Target = 'web' | 'native';

const GENERATED_HEADER = (target: Target, extraPath: string) =>
  `/* ============================================================================
 * GENERATED FILE — DO NOT EDIT.
 *
 * Target:      ${target}
 * Colours:     packages/tokens/src/tokens.ts
 * App CSS:     ${extraPath}
 * Regenerate:  pnpm tokens:sync
 *
 * Editing this file directly will fail the drift test in
 * packages/tokens/src/__tests__/drift.test.ts. Change tokens.ts instead.
 * ========================================================================== */`;

function varBlock(scheme: 'light' | 'dark'): string {
  const lines = colorRoles.map((role) => `    --${role}: ${colors[scheme][role]};`);
  if (scheme === 'light') lines.push(`    --radius: ${radius};`);
  return lines.join('\n');
}

/**
 * Renders a complete `global.css`.
 *
 * The generator writes whole files rather than having each app `@import` a
 * stylesheet from this package. Vite would resolve a bare-specifier @import
 * fine, but NativeWind's Metro CSS pipeline is not confirmed to run
 * postcss-import — and betting the mobile app's entire styling layer on
 * unverified behaviour in the least-supported part of the stack is a bad trade
 * for saving one file write.
 *
 * `extra` is the app's own hand-written CSS, appended verbatim. That is the
 * escape hatch: app-specific CSS goes in styles/extra.css, never here.
 */
export function renderGlobalCss(target: Target, extraPath: string, extra: string): string {
  const dark = target === 'web' ? '.dark' : '.dark:root';

  return `${GENERATED_HEADER(target, extraPath)}

@tailwind base;
@tailwind components;
@tailwind utilities;

/*
 * Token declarations sit OUTSIDE @layer base deliberately.
 *
 * Inside @layer base, Tailwind treats \`.dark { … }\` as a candidate rule and
 * purges it when no \`dark\` class and no \`dark:\` variant appear in the content
 * globs. A fresh app has neither, so the entire dark palette silently vanished
 * from the production CSS while dev looked fine — and it would reappear only
 * once someone happened to write a \`dark:\` utility.
 *
 * At top level these are plain custom-property declarations that Tailwind never
 * removes, so both palettes are always shipped and a dark-mode toggle works the
 * moment it is added. Verified by scripts/assert-css-output.mjs.
 */
:root {
${varBlock('light')}
}

${dark} {
${varBlock('dark')}
}

/* ---- ${extraPath} ---- */
${extra.trim()}
`;
}
