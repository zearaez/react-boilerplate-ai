import { create } from 'zustand';

import { logger } from '../../logger';
import { getRuntime } from '../../runtime';

import { sessionSchema } from './schemas';

import type { AuthTokens, Session, User } from './schemas';

export const SESSION_STORAGE_KEY = 'repo.session';

export type AuthStatus =
  /** configureCore ran, hydrate() has not been called yet. */
  | 'idle'
  /** Reading persisted state. Keep the splash screen up. */
  | 'hydrating'
  | 'authenticated'
  | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  tokens: AuthTokens | null;
  user: User | null;
  /** Read persisted session once, at app start. */
  hydrate: () => Promise<void>;
  signIn: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
  /** Replace the token pair after a refresh, keeping the user and the session. */
  setTokens: (tokens: AuthTokens) => Promise<void>;
  /**
   * Replace the user after they edit their own profile, keeping the tokens.
   *
   * The mirror of setTokens, and it exists for the same reason: a profile save
   * returns a fresh `UserProfileDetail`, and without this the name in the header
   * would keep showing the old one until the next cold start.
   */
  setUser: (user: User) => Promise<void>;
}

/**
 * The only Zustand store in @repo/core.
 *
 * A store belongs here ONLY if both apps need the same state with the same
 * semantics. In practice that means session state and nothing else. UI state
 * (sidebar open, active tab, toast queue) is app-local — put it in
 * apps/web/src/stores or apps/mobile/stores.
 *
 * Hydration is an explicit hydrate() rather than zustand's persist middleware
 * on purpose: persist reads storage when the store is CREATED, which is module
 * evaluation time, which would make correctness depend on whether
 * configureCore() happened to run first. That failure is nondeterministic and
 * import-order-dependent — the worst kind to debug. Fifteen explicit lines beat
 * an idiomatic race.
 */
export const useAuthStore = create<AuthState>()((set, get) => ({
  status: 'idle',
  tokens: null,
  user: null,

  hydrate: async () => {
    set({ status: 'hydrating' });
    try {
      const raw = await getRuntime().storage.get(SESSION_STORAGE_KEY);
      if (raw === null) {
        set({ status: 'unauthenticated', tokens: null, user: null });
        return;
      }

      // Persisted data is untrusted input: it may predate a schema change.
      const session = sessionSchema.parse(JSON.parse(raw));

      // A refresh token that expired while the app was closed cannot be
      // exchanged, so the stored session is already dead — starting
      // 'authenticated' would render the app and then 401 on the first request.
      //
      // `undefined` means the refresh token is in an httpOnly cookie, whose
      // expiry this code cannot read. There is nothing to check, so the session
      // is trusted and the first 401 decides — which is exactly what the refresh
      // interceptor is for.
      const { refreshTokenExpiresAt } = session.tokens;
      if (refreshTokenExpiresAt !== undefined && Date.parse(refreshTokenExpiresAt) <= Date.now()) {
        logger.info('Persisted session has an expired refresh token; signing out');
        await getRuntime()
          .storage.remove(SESSION_STORAGE_KEY)
          .catch(() => undefined);
        set({ status: 'unauthenticated', tokens: null, user: null });
        return;
      }

      set({ status: 'authenticated', tokens: session.tokens, user: session.user });
    } catch (error) {
      logger.warn('Discarding unreadable persisted session', { error: String(error) });
      await getRuntime()
        .storage.remove(SESSION_STORAGE_KEY)
        .catch(() => undefined);
      set({ status: 'unauthenticated', tokens: null, user: null });
    }
  },

  signIn: async (session) => {
    await getRuntime().storage.set(SESSION_STORAGE_KEY, JSON.stringify(session));
    set({ status: 'authenticated', tokens: session.tokens, user: session.user });
  },

  signOut: async () => {
    await getRuntime()
      .storage.remove(SESSION_STORAGE_KEY)
      .catch(() => undefined);
    set({ status: 'unauthenticated', tokens: null, user: null });
  },

  setTokens: async (tokens) => {
    const { user } = get();
    // No user means no session to attach the tokens to — refreshing into a
    // half-session would leave the app 'authenticated' with a null user.
    if (!user) return;

    await getRuntime().storage.set(SESSION_STORAGE_KEY, JSON.stringify({ tokens, user }));
    set({ tokens });
  },

  setUser: async (user) => {
    const { tokens } = get();
    // Same guard as setTokens, from the other side: no tokens means there is no
    // session to persist this into.
    if (!tokens) return;

    await getRuntime().storage.set(SESSION_STORAGE_KEY, JSON.stringify({ tokens, user }));
    set({ user });
  },
}));

/**
 * Non-React read path, for the axios interceptor.
 * Never call this from a component — use the hook so the component re-renders.
 */
export function getAuthToken(): string | null {
  return useAuthStore.getState().tokens?.accessToken ?? null;
}

/** Non-React read path for the 401 interceptor's refresh attempt. */
export function getRefreshToken(): string | null {
  return useAuthStore.getState().tokens?.refreshToken ?? null;
}
