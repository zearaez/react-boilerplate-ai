import * as React from 'react';

import { View } from 'react-native';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '~/lib/utils';

import { TextClassContext } from './text';

const badgeVariants = cva('self-start rounded-full px-2.5 py-0.5', {
  variants: {
    variant: {
      default: 'bg-primary',
      secondary: 'bg-secondary',
      destructive: 'bg-destructive',
      outline: 'border border-border',
    },
  },
  defaultVariants: { variant: 'default' },
});

const badgeTextVariants = cva('text-xs font-medium', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      secondary: 'text-secondary-foreground',
      destructive: 'text-destructive-foreground',
      outline: 'text-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
});

export type BadgeProps = React.ComponentProps<typeof View> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <TextClassContext.Provider value={badgeTextVariants({ variant })}>
      <View className={cn(badgeVariants({ variant }), className)} {...props} />
    </TextClassContext.Provider>
  );
}

export { badgeTextVariants, badgeVariants };
