import { initialsOf } from '@/lib/initials';
import { cn } from '@/lib/utils';

/**
 * The brand-tinted initials avatar from the Console design.
 *
 * the design system's rule is "avatars fall back to brand-tinted initials" — tint background,
 * `--primary-700` glyphs — which is exactly the `primary-tint` /
 * `primary-tint-foreground` pair, contrast-tested in packages/tokens.
 *
 * `aria-hidden` because the initials are never the accessible name: every place
 * this is used renders the full name as text beside it, and a screen reader
 * announcing "A S Anisha Shrestha" is noise.
 */
export function InitialsAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-8 flex-none items-center justify-center rounded-full bg-primary-tint text-xs font-bold text-primary-tint-foreground',
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
