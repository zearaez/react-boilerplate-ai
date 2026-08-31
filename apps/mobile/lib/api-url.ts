import Constants from 'expo-constants';

import { readEnv } from './env';

const MOCK_PORT = 4000;

/**
 * Resolves the API base URL for a device or simulator.
 *
 * The problem this solves: `localhost` on a physical device means the DEVICE, not
 * your laptop, so a hardcoded http://localhost:4000 works on a simulator and
 * silently fails on real hardware. Expo already knows your machine's LAN address
 * — it is serving the bundle from it — so we read it back out of `hostUri`
 * instead of asking anyone to paste in an IP.
 *
 * Order of precedence:
 *   1. EXPO_PUBLIC_API_URL, if set (staging, production, a tunnel)
 *   2. the Expo dev-server host on MOCK_PORT (works on device AND simulator)
 *   3. localhost, as a last resort
 */
export function resolveApiUrl(): string {
  const explicit = readEnv('EXPO_PUBLIC_API_URL');
  if (explicit) return explicit;

  // expo-constants types expoConfig loosely, so hostUri arrives as `any`.
  // Narrowing through `unknown` keeps the repo's no-unsafe-* rules meaningful
  // instead of letting one library boundary leak `any` into the app.
  const hostUri: unknown = Constants.expoConfig?.hostUri;

  // e.g. "192.168.1.42:8081" -> "192.168.1.42"
  const lanHost = typeof hostUri === 'string' ? hostUri.split(':')[0] : undefined;
  if (lanHost) return `http://${lanHost}:${String(MOCK_PORT)}`;

  return `http://localhost:${String(MOCK_PORT)}`;
}

export const API_URL = resolveApiUrl();
