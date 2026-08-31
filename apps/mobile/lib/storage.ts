import * as SecureStore from 'expo-secure-store';

import type { CoreStorage } from '@repo/core';

/**
 * Mobile storage adapter, backed by the platform keychain / keystore.
 *
 * Unlike web (where the token is memory-only), persisting on device is the right
 * call: SecureStore is hardware-backed and not readable by other apps, and a
 * mobile user should not be signed out every time the app is killed.
 *
 * SecureStore rejects values over 2048 bytes on iOS, and does it by throwing at
 * write time. A JWT plus a refresh token can cross that, so the limit is checked
 * here with a message that says what to do rather than letting it surface as an
 * opaque native error.
 */
const MAX_VALUE_BYTES = 2000;

export const secureStorage: CoreStorage = {
  get: (key) => SecureStore.getItemAsync(key),

  set: async (key, value) => {
    if (value.length > MAX_VALUE_BYTES) {
      throw new Error(
        `Refusing to write ${String(value.length)} bytes to SecureStore key "${key}": ` +
          `iOS caps items at 2048 bytes. Store only the access token here and keep ` +
          `larger payloads in the query cache.`,
      );
    }
    await SecureStore.setItemAsync(key, value);
  },

  remove: (key) => SecureStore.deleteItemAsync(key),
};
