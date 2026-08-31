import { logger } from '../../logger';

import { restoreSessionFromCookie } from './api';
import { useAuthStore } from './store';

/**
 * The one call an app makes at startup to answer "is anyone signed in?".
 *
 * Two sources, in order of trust:
 *
 *  1. Persisted storage — the mobile keychain. Holds a full session including
 *     the refresh token, so it needs no network at all.
 *  2. An httpOnly refresh cookie — the only thing that can survive a reload on
 *     web, where storage is memory-only by design and therefore always empty on
 *     a cold start.
 *
 * Why this lives here rather than inside the store's `hydrate()`: the cookie path
 * needs the api layer, api/client.ts imports the store, and store importing api
 * would close that loop — `import-x/no-cycle` rejects it, correctly. Keeping the
 * orchestration in a leaf module is the fix.
 *
 * BOTH apps must call this instead of `hydrate()`, and both must await it before
 * revealing UI — web awaits it before `createRoot`, mobile keeps the splash
 * screen up. That is what hides the intermediate 'unauthenticated' the store
 * passes through between the two sources; without it, a signed-in user would see
 * the login screen flash before the cookie probe answered.
 */
export async function bootstrapSession(): Promise<void> {
  await useAuthStore.getState().hydrate();

  if (useAuthStore.getState().status === 'authenticated') return;

  const session = await restoreSessionFromCookie();
  if (session === null) return;

  logger.info('Restored a session from the refresh cookie');
  await useAuthStore.getState().signIn(session);
}
