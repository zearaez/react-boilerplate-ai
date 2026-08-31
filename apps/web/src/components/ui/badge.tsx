/*
 * Vendored from the shadcn/ui registry (style: new-york, Tailwind 3):
 *   https://ui.shadcn.com/r/styles/new-york/badge.json
 *
 * WE OWN THIS FILE. It is exempt from the repo's authored-code lint rules
 * (see packages/config/eslint/react-web.js) because we do not restyle it.
 *
 * To add another primitive, prefer refetching from that same /styles/new-york/
 * path — it serves Tailwind 3 classes. The default shadcn CLI now emits
 * Tailwind 4 syntax (@theme, outline-hidden), which this repo cannot build.
 */

import * as React from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
