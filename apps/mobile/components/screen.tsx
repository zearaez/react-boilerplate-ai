import * as React from 'react';

import { View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from '~/lib/utils';

/**
 * Page container. Applies bottom safe-area padding only — the header handles the
 * top inset, so padding both double-pads every screen with a header.
 */
export interface ScreenProps extends React.ComponentProps<typeof View> {
  /** Set false on screens with their own scroll view handling insets. */
  withBottomInset?: boolean;
}

export function Screen({ className, style, withBottomInset = true, ...props }: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className={cn('flex-1 bg-background', className)}
      style={[withBottomInset ? { paddingBottom: insets.bottom } : null, style]}
      {...props}
    />
  );
}
