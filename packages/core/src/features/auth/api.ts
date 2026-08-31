import { REFRESH_PATH, getApiClient } from '../../api/client';
import { ApiError, parseRequestBody, toApiError } from '../../api/errors';
import { logger } from '../../logger';

import {
  type AuthTokens,
  type ChangePasswordInput,
  type ForgotPasswordInput,
  type LoginInput,
  type PasswordResetRequested,
  type ResetPasswordInput,
  type Session,
  type UpdateMyProfileInput,
  type User,
  authTokensSchema,
  changePasswordInputSchema,
  forgotPasswordInputSchema,
  passwordResetRequestedSchema,
  resetPasswordInputSchema,
  updateMyProfileInputSchema,
  userSchema,
} from './schemas';
// store, not hooks: this is the non-React read path for the caller's own id, and
// api functions must work outside a React tree. No cycle — the store imports
// runtime and schemas, never this file.
import { useAuthStore } from './store';

/**
 * Every api function follows the same three-line shape:
 *   1. call the client
 *   2. Schema.parse(response.data)   <- never `as`, never trust the server
 *   3. catch -> toApiError
 *
 * The parse is not ceremony. It is what turns "the backend changed a field" from
 * a mystery crash three screens later into a clear error at the boundary.
 */

/**
 * Sign in. TWO round trips, and that is the API's design, not an oversight:
 * `POST /auth/login` returns credentials only, with no user object anywhere in
 * `AuthTokenResponse`, so the profile is a second call.
 *
 * The Authorization header is set explicitly here because the token has not been
 * stored yet — the request interceptor reads the store, and the store is only
 * written once this function resolves. Relying on the interceptor would send the
 * PREVIOUS user's token, or none at all.
 */
export async function login(input: LoginInput): Promise<Session> {
  try {
    // NOT parseRequestBody(loginInputSchema, …) — deliberately. That schema's
    // 8-character minimum is a rule for CHOOSING a password, and an account
    // created before the rule existed still has to be able to sign in. Validating
    // here would reject it locally with "some of the details you entered are not
    // valid" instead of letting the server give the real answer. The login FORM
    // still validates; this is the transport.
    const tokenResponse = await getApiClient().post('/auth/login', input);
    const tokens = authTokensSchema.parse(tokenResponse.data);

    const meResponse = await getApiClient().get('/users/me', {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    const user = userSchema.parse(meResponse.data);

    return { tokens, user };
  } catch (error) {
    throw toApiError(error);
  }
}

/**
 * Exchange a refresh token for a fresh pair.
 *
 * The token goes in the body, not the Authorization header — the access token is
 * expired by definition at this point, so there is nothing worth attaching.
 *
 * The 401 interceptor in api/client.ts does its own refresh with a bare axios
 * call (it cannot import this module without a cycle, and must not recurse
 * through its own interceptor). This function is the explicit, callable version —
 * use it when you want to refresh deliberately rather than reactively.
 */
export async function refreshTokens(refreshToken?: string): Promise<AuthTokens> {
  try {
    // Called with no argument under the cookie contract: the credential is the
    // httpOnly cookie, which the browser attaches and JavaScript never sees.
    const response = await getApiClient().post(
      REFRESH_PATH,
      refreshToken === undefined ? undefined : { refresh_token: refreshToken },
    );
    return authTokensSchema.parse(response.data);
  } catch (error) {
    throw toApiError(error);
  }
}

/** How long the cold-start probe waits before deciding there is no session. */
const SESSION_PROBE_TIMEOUT_MS = 5_000;

/**
 * The cold-start question: "does this browser already hold a session?"
 *
 * This is what makes a reload survivable on web. Nothing is in memory after a
 * reload and nothing is in storage by design, so the only thing that can still
 * prove a session is the httpOnly refresh cookie — which JavaScript cannot read,
 * but the browser will happily send.
 *
 * Resolves to null for EVERY failure, and that is deliberate: no cookie, an
 * expired cookie, an API with no cookie support (today), or a dead network are
 * all just "no session to restore". A probe must never throw into app startup and
 * must never sign anything out.
 *
 * The short timeout matters more than it looks: this runs before the first paint
 * on both platforms, so the default 15s would hold a signed-out user on a splash
 * screen for fifteen seconds on a bad connection.
 */
export async function restoreSessionFromCookie(): Promise<Session | null> {
  try {
    const tokenResponse = await getApiClient().post(REFRESH_PATH, undefined, {
      timeout: SESSION_PROBE_TIMEOUT_MS,
      isSessionProbe: true,
    });
    const tokens = authTokensSchema.parse(tokenResponse.data);

    // Same two-round-trip shape as login(), and for the same reason: the token
    // response carries no user, and the token is not in the store yet.
    const meResponse = await getApiClient().get('/users/me', {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
      timeout: SESSION_PROBE_TIMEOUT_MS,
      isSessionProbe: true,
    });

    return { tokens, user: userSchema.parse(meResponse.data) };
  } catch (error) {
    logger.debug('No cookie session to restore', { error: String(error) });
    return null;
  }
}

/**
 * Sign out.
 *
 * Under the cookie contract this call stops being optional: an httpOnly cookie
 * can ONLY be cleared by the server that set it, so without this the browser
 * keeps a live credential and the very next cold start silently signs the user
 * back in — a sign-out button that does not sign you out.
 *
 * `POST /auth/logout` is a 404 on the deployment today, which is why every
 * failure is swallowed rather than thrown. Local sign-out must succeed no matter
 * what the network says; the caller has already decided the session is over.
 */
export async function logout(): Promise<void> {
  try {
    await getApiClient().post('/auth/logout');
  } catch (error) {
    // A 404 here is today's expected answer, so this is info, not a warning.
    logger.info('Logout endpoint did not confirm; clearing the session locally', {
      error: String(error),
    });
  }
}

export async function fetchCurrentUser(): Promise<User> {
  try {
    const response = await getApiClient().get('/users/me');
    return userSchema.parse(response.data);
  } catch (error) {
    throw toApiError(error);
  }
}

/**
 * NOT IMPLEMENTED BY THE SERVER YET.
 *
 * The starter's own API surface is register, login and refresh; forgot/reset
 * password is not part of it. These two functions and the screens behind them
 * work against the mock backend so the flow stays built and tested, and they will
 * 404 against a real API until the endpoints land.
 *
 * Kept rather than deleted deliberately: the flow is finished, tested on both
 * platforms, and cheap to point at real endpoints once they exist.
 */
export async function requestPasswordReset(
  input: ForgotPasswordInput,
): Promise<PasswordResetRequested> {
  try {
    const body = parseRequestBody(forgotPasswordInputSchema, input);
    const response = await getApiClient().post('/auth/forgot-password', body);
    return passwordResetRequestedSchema.parse(response.data);
  } catch (error) {
    throw toApiError(error);
  }
}

/**
 * Resolves with nothing on success: the reset does NOT sign the user in.
 *
 * A reset link is a bearer credential that may have been forwarded, screenshotted
 * or sat in an inbox for an hour, so it is worth one password change and not a
 * session. See the note on requestPasswordReset — this endpoint does not exist on
 * the real server yet either.
 */
export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  try {
    // Destructured rather than passed whole: confirmPassword is a UI concern and
    // has no business crossing the network.
    const { token, password } = parseRequestBody(resetPasswordInputSchema, input);
    await getApiClient().post('/auth/reset-password', { token, password });
  } catch (error) {
    throw toApiError(error);
  }
}

/**
 * Update the signed-in user's own profile — `PATCH /users/me`.
 *
 * `user_id` comes from the SESSION, never the form. The command carries it, so a
 * caller who could set it could patch another account; reading it here means the
 * only profile this function can touch is the caller's.
 *
 * Returns the updated `UserProfileDetail`, which is the same shape `GET /users/me`
 * returns — so the auth store can be refreshed straight from the response.
 */
export async function updateMyProfile(input: UpdateMyProfileInput): Promise<User> {
  try {
    const body = parseRequestBody(updateMyProfileInputSchema, input);
    const userId = useAuthStore.getState().user?.id;

    if (userId === undefined) {
      // Not a network failure: a profile form rendered without a session is a
      // routing bug, and saying so beats a 401 the user cannot act on.
      throw new ApiError('unauthorized', 'You must be signed in to update your profile.');
    }

    const response = await getApiClient().patch('/users/me', {
      user_id: userId,
      name: body.name,
      phone: body.phone,
    });

    return userSchema.parse(response.data);
  } catch (error) {
    throw toApiError(error);
  }
}

/**
 * Change the password — `POST /users/me/password`.
 *
 * **This revokes every refresh token, including the one this session is holding.**
 * It is the only server-side revocation the API offers, which makes it the
 * real "sign out everywhere". A caller MUST therefore treat success as the end of
 * the session and send the user back to sign in — continuing would work only
 * until the access token expires, then fail in a way that looks like a bug.
 *
 * Resolves with nothing: the endpoint answers 204.
 */
export async function changeMyPassword(input: ChangePasswordInput): Promise<void> {
  try {
    // confirmPassword is destructured away — a UI-only field has no business
    // crossing the network.
    const { currentPassword, newPassword } = parseRequestBody(changePasswordInputSchema, input);
    const userId = useAuthStore.getState().user?.id;

    if (userId === undefined) {
      throw new ApiError('unauthorized', 'You must be signed in to change your password.');
    }

    await getApiClient().post('/users/me/password', {
      user_id: userId,
      current_password: currentPassword,
      new_password: newPassword,
    });
  } catch (error) {
    throw toApiError(error);
  }
}
