/*
 * Vendored from the shadcn/ui registry (style: new-york, Tailwind 3):
 *   https://ui.shadcn.com/r/styles/new-york/label.json
 *
 * WE OWN THIS FILE. It is exempt from the repo's authored-code lint rules
 * (see packages/config/eslint/react-web.js) because we do not restyle it.
 *
 * To add another primitive, prefer refetching from that same /styles/new-york/
 * path — it serves Tailwind 3 classes. The default shadcn CLI now emits
 * Tailwind 4 syntax (@theme, outline-hidden), which this repo cannot build.
 */

'use client';

import * as React from 'react';

import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
