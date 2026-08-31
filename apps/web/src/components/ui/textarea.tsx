/*
 * Vendored from the shadcn/ui registry (style: new-york, Tailwind 3):
 *   https://ui.shadcn.com/r/styles/new-york/textarea.json
 *
 * WE OWN THIS FILE. It is exempt from the repo's authored-code lint rules
 * (see packages/config/eslint/react-web.js) because we do not restyle it.
 *
 * To add another primitive, prefer refetching from that same /styles/new-york/
 * path — it serves Tailwind 3 classes. The default shadcn CLI now emits
 * Tailwind 4 syntax (@theme, outline-hidden), which this repo cannot build.
 */

import * as React from 'react';

import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
