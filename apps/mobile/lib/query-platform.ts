import { AppState, type NativeEventSubscription, Platform } from 'react-native';

import { focusManager } from '@tanstack/react-query';

/**
 * The ONE legitimate platform difference in the query layer.
 *
 * TanStack Query's focus tracking listens for a DOM `visibilitychange` event,
 * which does not exist on React Native. Without this, `refetchOnWindowFocus`
 * never fires on mobile — so the setting looks configured but does nothing.
 *
 * Web needs no equivalent file. That asymmetry is real and is documented here
 * rather than hidden behind an abstraction that pretends the platforms are the
 * same.
 */
export function wireQueryFocusManager(): NativeEventSubscription {
  return AppState.addEventListener('change', (status) => {
    if (Platform.OS !== 'web') {
      focusManager.setFocused(status === 'active');
    }
  });
}
