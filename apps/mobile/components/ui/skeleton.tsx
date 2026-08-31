import * as React from 'react';

import { View } from 'react-native';

import { cn } from '~/lib/utils';

/**
 * Static rather than animated on purpose. An animated shimmer needs Reanimated
 * worklets, and a pulsing placeholder is exactly the kind of motion that
 * `prefers-reduced-motion` users ask not to see. A flat block reads as "loading"
 * without either cost.
 */
export type SkeletonProps = React.ComponentProps<typeof View>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <View
      accessibilityRole="progressbar"
      className={cn('rounded-md bg-muted', className)}
      {...props}
    />
  );
}
