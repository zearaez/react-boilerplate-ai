import { configureCore } from '@repo/core';

import { API_URL } from './lib/api-url';
import { secureStorage } from './lib/storage';

/**
 * Configures @repo/core for the native platform.
 *
 * MUST be imported before anything that calls getRuntime(). app/_layout.tsx
 * imports it first, and expo-router loads that layout before any route.
 */
configureCore({
  apiUrl: API_URL,
  storage: secureStorage,
});
