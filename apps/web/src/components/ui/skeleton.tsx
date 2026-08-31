/*
 * Vendored from the shadcn/ui registry (style: new-york, Tailwind 3):
 *   https://ui.shadcn.com/r/styles/new-york/skeleton.json
 *
 * WE OWN THIS FILE. It is exempt from the repo's authored-code lint rules
 * (see packages/config/eslint/react-web.js) because we do not restyle it.
 *
 * To add another primitive, prefer refetching from that same /styles/new-york/
 * path — it serves Tailwind 3 classes. The default shadcn CLI now emits
 * Tailwind 4 syntax (@theme, outline-hidden), which this repo cannot build.
 */

import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-primary/10', className)} {...props} />;
}

export { Skeleton };
