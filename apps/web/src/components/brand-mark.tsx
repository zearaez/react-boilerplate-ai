import { cn } from '@/lib/utils';

/**
 * The app's mark. Replace the glyph with your own — it is deliberately one
 * small SVG and nothing else depends on its shape.
 *
 * Every colour is a token class rather than a fill attribute: `fill-*`/`stroke-*`
 * resolve through the Tailwind preset, so the mark follows the theme and the raw
 * hex the design ships (`#fff`, `var(--primary-700)`, `var(--secondary-400)`)
 * never reaches the codebase — which is what `no-restricted-syntax` is there to
 * prevent.
 *
 * `onPrimary` is for the mark sitting ON the brand panel, where the tile has to
 * be the light colour and the glyph the brand one — the inverse of its use on a
 * normal page background.
 */
export function BrandMark({
  className,
  onPrimary = false,
}: {
  className?: string;
  onPrimary?: boolean;
}) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={cn('size-9', className)}>
      <rect
        width="64"
        height="64"
        rx="16"
        className={onPrimary ? 'fill-primary-foreground' : 'fill-primary'}
      />
      <path
        d="M22 16v26a2 2 0 0 0 2 2h18"
        strokeWidth="6"
        strokeLinecap="round"
        className={onPrimary ? 'stroke-primary' : 'stroke-primary-foreground'}
      />
      <circle cx="42" cy="22" r="5" className="fill-brand-accent" />
    </svg>
  );
}
