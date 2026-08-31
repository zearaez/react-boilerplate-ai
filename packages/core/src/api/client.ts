import axios, { type AxiosInstance } from 'axios';

import { authTokensSchema } from '../features/auth/schemas';
import { getAuthToken, getRefreshToken, useAuthStore } from '../features/auth/store';
// Imported from the module, NOT from '../features/bug-reporter' — that barrel
// re-exports the feature's api.ts, which imports this file, and import-x/no-cycle
// (correctly) rejects the loop.
import { recordFailedRequest } from '../features/bug-reporter/diagnostics';
import { logger } from '../logger';
import { getRuntime, onCoreReset } from '../runtime';

const REQUEST_TIMEOUT_MS = 15_000;

/**
 * The refresh endpoint. Declared HERE rather than in features/auth/api.ts because
 * this interceptor must recognise it, and auth/api.ts already imports this file —
 * the other direction would be an import cycle.
 */
export const REFRESH_PATH = '/auth/refresh';

/**
 * Marks a request that has already been retried after a token refresh, so a
 * second 401 gives up instead of refreshing forever.
 *
 * Declaration merging rather than a cast: axios owns this type, and widening it
 * properly beats an `as` at each of the three places the flag is touched.
 */
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    isRetryAfterRefresh?: boolean;
  }

  /**
   * Marks the cold-start "is there a cookie session?" probe. A probe that fails
   * is the normal signed-out case, not an incident, so it is kept out of the bug
   * reporter's failed-request breadcrumbs.
   *
   * Declared on the PUBLIC config, not the internal one, because unlike
   * `isRetryAfterRefresh` this flag is set by a caller passing a config object —
   * and `InternalAxiosRequestConfig` extends this, so the interceptor still sees
   * it.
   */
  interface AxiosRequestConfig {
    isSessionProbe?: boolean;
  }
}

/**
 * The three outcomes of a refresh attempt, kept apart because only ONE of them
 * means the session is over.
 *
 * The distinction is not theoretical. `refresh_token_expires_at` is thirty days
 * out, so a signed-in user spends almost all of that window one flaky request
 * away from a refresh. Collapsing "the API refused this credential" into "the
 * API did not answer" is what turns a tunnel, a captive portal or a 502 during a
 * deploy into a sign-out — while the refresh token was valid the whole time.
 */
type RefreshResult =
  /** New credential in hand; replay the request. */
  | { outcome: 'refreshed'; accessToken: string }
  /** The API refused the refresh token itself. The session really is over. */
  | { outcome: 'rejected' }
  /** The exchange could not be completed. Says nothing about the token. */
  | { outcome: 'unavailable' };

/**
 * Statuses that mean the refresh TOKEN was refused, rather than the request
 * having failed for some unrelated reason.
 *
 * 400 is first because it is what the live server actually sends: a spent or
 * unknown refresh token comes back `400 ProblemDetails` with
 * `detail: "Invalid or expired refresh token"`, NOT a 401. 401 and 403 are here
 * because a gateway or a different deployment may answer either, and all three
 * carry the same meaning — presenting this credential again will not help.
 */
const REFRESH_REJECTED_STATUSES = new Set([400, 401, 403]);

let instance: AxiosInstance | null = null;
let refreshInFlight: Promise<RefreshResult> | null = null;

// Tests call resetCore() between cases; drop the cached instance so the next
// one picks up the new apiUrl.
onCoreReset(() => {
  instance = null;
  refreshInFlight = null;
});

/**
 * Exchange the refresh token for a new pair, and store it.
 *
 * Uses a BARE axios call, not the shared instance: this runs from inside that
 * instance's response interceptor, so routing the refresh through it would let a
 * 401 on the refresh recurse into itself.
 *
 * Never throws — the caller is an error handler. It reports which of the three
 * RefreshResult outcomes happened, and only 'rejected' ends the session.
 */
async function performRefresh(): Promise<RefreshResult> {
  const refreshToken = getRefreshToken();

  try {
    const response = await axios.post(
      `${getRuntime().apiUrl}${REFRESH_PATH}`,
      // No token in memory is NOT a dead end any more: under the cookie contract
      // the refresh token rides in an httpOnly cookie, so the credential is in
      // the request whether or not JavaScript can see it. Send a body only when
      // there is something to send, and let the server decide.
      refreshToken === null ? undefined : { refresh_token: refreshToken },
      {
        timeout: REQUEST_TIMEOUT_MS,
        headers: { 'Content-Type': 'application/json' },
        // Required for the cookie to be sent at all, and for a rotated one to be
        // stored. This is a BARE axios call, so it does not inherit the shared
        // instance's setting.
        withCredentials: true,
      },
    );

    const tokens = authTokensSchema.parse(response.data);
    await useAuthStore.getState().setTokens(tokens);
    return { outcome: 'refreshed', accessToken: tokens.accessToken };
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;

    if (status !== undefined && REFRESH_REJECTED_STATUSES.has(status)) {
      logger.info('The API refused the refresh token; ending the session', { status });
      return { outcome: 'rejected' };
    }

    // Everything else: offline, DNS, timeout, CORS, a 5xx, or a 200 whose body
    // did not match authTokensSchema. None of those is evidence about the token,
    // so the session stays and the next request tries the exchange again.
    //
    // One honest caveat, because refresh tokens ROTATE: if the server did issue a
    // new pair and only the RESPONSE was lost, the stored token has already been
    // spent, and every later attempt will come back 'rejected'. Holding on costs
    // one more failed refresh in that single case; treating it as dead costs a
    // sign-out in all the others.
    logger.warn('Could not complete a token refresh; keeping the session', {
      status: status ?? 'no response',
      error: String(error),
    });
    return { outcome: 'unavailable' };
  }
}

/**
 * Single-flight wrapper around performRefresh.
 *
 * This is the part that is easy to get wrong. The API ROTATES refresh
 * tokens — `/auth/refresh` returns a new refresh token and invalidates the one
 * presented. So if a screen fires four queries and all four 401 together, four
 * parallel refreshes means the first succeeds and the other three present a token
 * that has just been revoked, fail, and sign out a session that was fine.
 * Sharing one in-flight promise is what makes concurrent 401s safe.
 */
function refreshOnce(): Promise<RefreshResult> {
  refreshInFlight ??= performRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

/**
 * The single axios instance. Created lazily because its baseURL comes from
 * CoreRuntime, which is configured at app start rather than at import time.
 *
 * Nothing outside src/features/<name>/api.ts should call this. Screens talk to
 * hooks, hooks talk to api functions, api functions talk to this.
 */
export function getApiClient(): AxiosInstance {
  if (instance !== null) return instance;

  const client = axios.create({
    baseURL: getRuntime().apiUrl,
    timeout: REQUEST_TIMEOUT_MS,
    headers: { 'Content-Type': 'application/json' },
    /**
     * Send and accept cookies. Needed for the httpOnly refresh cookie, and inert
     * until the API sets one — it does not put anything in a request that was not
     * already there.
     *
     * It does raise the CORS bar: with credentials on, a browser rejects a
     * wildcard `Access-Control-Allow-Origin` and requires
     * `Access-Control-Allow-Credentials: true`. The API must answer with
     * an explicitly echoed origin and that header, but its allowlist is exact —
     * localhost:5173 and :5174 and nothing else — so a dev server on another port
     * fails CORS outright rather than degrading.
     */
    withCredentials: true,
  });

  client.interceptors.request.use((config) => {
    /*
     * An explicitly-set Authorization header WINS over the store.
     *
     * It used to be the other way round, and that is a trap: `login()` and
     * `restoreSessionFromCookie()` both attach a freshly-minted token by hand
     * because the store has not been written yet — but if a STALE session is
     * still in the store (signing in again after a password change revoked the
     * old one, say), the interceptor would replace the good token with the dead
     * one and the call would 401 for no visible reason.
     *
     * The 401 replay benefits too: it sets the rotated token on the config
     * directly, so it no longer depends on setTokens() having landed first.
     */
    if (config.headers.Authorization === undefined) {
      const token = getAuthToken();
      if (token !== null) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;

      // Remember the failure for the bug reporter. Recorded here rather than by
      // wrapping global fetch, because axios uses XMLHttpRequest on both
      // browsers and Hermes — a fetch wrapper would never see these calls. The
      // report then answers "what broke just before you hit the button?".
      if (axios.isAxiosError(error) && error.config?.isSessionProbe !== true) {
        recordFailedRequest({
          method: error.config?.method?.toUpperCase(),
          url: error.config?.url,
          status,
          code: error.code,
          message: error.message,
        });
      }

      if (!axios.isAxiosError(error) || status !== 401) throw error;

      const config = error.config;
      const isRefreshCall = config?.url?.includes(REFRESH_PATH) === true;
      const canRetry =
        config !== undefined &&
        !isRefreshCall &&
        config.isRetryAfterRefresh !== true &&
        useAuthStore.getState().status === 'authenticated';

      if (canRetry) {
        const result = await refreshOnce();

        if (result.outcome === 'refreshed') {
          // Replay the original request once, with the new credential.
          config.isRetryAfterRefresh = true;
          config.headers.Authorization = `Bearer ${result.accessToken}`;
          return client.request(config);
        }

        // The refresh could not be completed — offline, timed out, or the server
        // broke. That is not proof the refresh token is dead, so the session
        // survives and THIS call fails as the 401 it already was. The user keeps
        // their session; the next request retries the exchange.
        if (result.outcome === 'unavailable') throw error;
      }

      // 401 with no way back: the token is dead and could not be renewed. Clear
      // the session and let the route guards react — web's <ProtectedLayout> and
      // native's <Stack.Protected> both watch useAuthStore, so neither needs a
      // navigator injected here.
      if (useAuthStore.getState().status === 'authenticated') {
        logger.info('Session rejected by the API; signing out');
        await useAuthStore.getState().signOut();
      }

      throw error;
    },
  );

  instance = client;
  return client;
}
