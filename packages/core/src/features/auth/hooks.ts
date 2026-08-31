import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  changeMyPassword,
  fetchCurrentUser,
  login,
  logout,
  requestPasswordReset,
  resetPassword,
  updateMyProfile,
} from './api';
import { authKeys } from './keys';
import { useAuthStore } from './store';

import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  PasswordResetRequested,
  ResetPasswordInput,
  Session,
  UpdateMyProfileInput,
  User,
} from './schemas';
import type { ApiError } from '../../api/errors';

/** Session state from the store. Use this in components, never getAuthToken(). */
export function useSession() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  return {
    status,
    user,
    isAuthenticated: status === 'authenticated',
    /** True while persisted state is being read — keep the splash screen up. */
    isLoading: status === 'idle' || status === 'hydrating',
  };
}

export function useLogin() {
  const queryClient = useQueryClient();
  const signIn = useAuthStore((state) => state.signIn);

  return useMutation<Session, ApiError, LoginInput>({
    mutationFn: login,
    onSuccess: async (session) => {
      // Clear before storing the new session: any cached data belongs to the
      // previous user. This is also what makes the 401-interceptor path safe —
      // it only clears the session, and the next login clears the cache.
      queryClient.clear();
      await signIn(session);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const signOut = useAuthStore((state) => state.signOut);

  return useMutation<void, ApiError, void>({
    mutationFn: logout,
    // Sign out locally even if the server call fails. A user who pressed
    // "log out" must end up logged out.
    onSettled: async () => {
      await signOut();
      queryClient.clear();
    },
  });
}

/**
 * Step one of the reset flow. No cache work and no session change: the caller is
 * a stranger by definition, so there is nothing of theirs to update.
 *
 * Read `passwordResetRequestedSchema` before writing the success UI — a success
 * here does NOT mean an email was sent, and the copy must not say it did.
 */
export function useRequestPasswordReset() {
  return useMutation<PasswordResetRequested, ApiError, ForgotPasswordInput>({
    mutationFn: requestPasswordReset,
  });
}

/**
 * Step two. Deliberately does not sign anyone in — see the note on
 * `resetPassword` in api.ts.
 *
 * The signOut is not redundant: the server revoked every session for the account,
 * so any session this device is still holding is already dead server-side. Leaving
 * it in the store would leave the app rendering an authenticated shell whose every
 * request 401s.
 */
export function useResetPassword() {
  const queryClient = useQueryClient();
  const signOut = useAuthStore((state) => state.signOut);

  return useMutation<void, ApiError, ResetPasswordInput>({
    mutationFn: resetPassword,
    onSuccess: async () => {
      await signOut();
      queryClient.clear();
    },
  });
}

/**
 * Server-side user record. Demonstrates `enabled` — the query must not fire
 * before there is a token to send.
 */
export function useCurrentUser() {
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated');

  return useQuery<User, ApiError>({
    queryKey: authKeys.currentUser(),
    queryFn: fetchCurrentUser,
    enabled: isAuthenticated,
  });
}

/**
 * Update the signed-in user's own profile.
 *
 * On success the auth store is refreshed from the response, so the header, the
 * profile screen and anything else reading `useSession()` update together — the
 * name in the top bar is the same value this mutation just changed.
 */
export function useUpdateMyProfile() {
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation<User, ApiError, UpdateMyProfileInput>({
    mutationFn: updateMyProfile,
    onSuccess: async (user) => {
      await setUser(user);
    },
  });
}

/**
 * Change the password.
 *
 * Signs out on success, deliberately. The endpoint revokes every refresh token
 * including this session's, so the session is already over server-side — leaving
 * the user apparently signed in would work until the access token expired and
 * then fail in a way that looks like a bug. Ending it here makes the consequence
 * immediate and honest.
 */
export function useChangeMyPassword() {
  const signOut = useAuthStore((state) => state.signOut);

  return useMutation<void, ApiError, ChangePasswordInput>({
    mutationFn: changeMyPassword,
    onSuccess: async () => {
      await signOut();
    },
  });
}
