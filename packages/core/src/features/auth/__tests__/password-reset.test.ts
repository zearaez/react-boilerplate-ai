import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import { DEMO_EMAIL, DEMO_PASSWORD, DEMO_RESET_CODE } from '@repo/mocks';

import { authenticateTestUser } from '../../../test/authenticate';
import { renderHookWithQuery } from '../../../test/render-hook';
import { server } from '../../../test/setup';
import { fetchCurrentUser, login, requestPasswordReset, resetPassword } from '../api';
import { useResetPassword } from '../hooks';
import { resetPasswordInputSchema } from '../schemas';
import { useAuthStore } from '../store';

const NEW_PASSWORD = 'a-brand-new-password';

/** The mock only accepts a code after one has actually been requested. */
async function requestCodeForDemoUser(): Promise<void> {
  await requestPasswordReset({ email: DEMO_EMAIL });
}

describe('resetPasswordInputSchema', () => {
  it('attaches the mismatch error to confirmPassword, not the form root', () => {
    const result = resetPasswordInputSchema.safeParse({
      token: DEMO_RESET_CODE,
      password: NEW_PASSWORD,
      confirmPassword: 'something-else',
    });

    expect(result.success).toBe(false);
    // The path is the whole reason this uses superRefine: react-hook-form can only
    // render the message next to an input if the issue names that input.
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([['confirmPassword']]);
  });

  it('enforces the same minimum length as the login form', () => {
    const result = resetPasswordInputSchema.safeParse({
      token: DEMO_RESET_CODE,
      password: 'short',
      confirmPassword: 'short',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => /at least 8 characters/.test(issue.message))).toBe(
      true,
    );
  });

  it('rejects a blank code', () => {
    const result = resetPasswordInputSchema.safeParse({
      token: '   ',
      password: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['token']);
  });
});

describe('requestPasswordReset', () => {
  it('answers identically for an address with no account', async () => {
    // The anti-enumeration guarantee. If this ever starts differing — a 404, a
    // different body, anything — the endpoint has become a way to test whether
    // someone has an account here.
    await expect(requestPasswordReset({ email: DEMO_EMAIL })).resolves.toEqual({ status: 'sent' });
    await expect(requestPasswordReset({ email: 'nobody@example.com' })).resolves.toEqual({
      status: 'sent',
    });
  });

  it('rejects a malformed address before the network', async () => {
    // parseRequestBody, so this is a 'validation' error with fieldErrors a form can
    // render — not a 'schema' error, which would mean the backend contract broke.
    await expect(requestPasswordReset({ email: 'not-an-email' })).rejects.toMatchObject({
      kind: 'validation',
      fieldErrors: { email: expect.any(Array) },
    });
  });
});

describe('resetPassword', () => {
  it('changes the password so the new one works and the old one does not', async () => {
    await requestCodeForDemoUser();

    await expect(
      resetPassword({
        token: DEMO_RESET_CODE,
        password: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
      }),
    ).resolves.toBeUndefined();

    await expect(login({ email: DEMO_EMAIL, password: NEW_PASSWORD })).resolves.toMatchObject({
      user: { email: DEMO_EMAIL },
    });
    // 400, not 401: the live server answers bad credentials with Bad Request.
    await expect(login({ email: DEMO_EMAIL, password: DEMO_PASSWORD })).rejects.toMatchObject({
      kind: 'validation',
      status: 400,
    });
  });

  it('rejects a code that was never issued, with the error on the token field', async () => {
    await expect(
      resetPassword({
        token: DEMO_RESET_CODE,
        password: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
      }),
    ).rejects.toMatchObject({
      kind: 'validation',
      fieldErrors: { token: expect.any(Array) },
    });
  });

  it('spends the code: the same one cannot be used twice', async () => {
    await requestCodeForDemoUser();
    await resetPassword({
      token: DEMO_RESET_CODE,
      password: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    });

    await expect(
      resetPassword({
        token: DEMO_RESET_CODE,
        password: 'another-new-password',
        confirmPassword: 'another-new-password',
      }),
    ).rejects.toMatchObject({ kind: 'validation' });
  });

  it('never sends confirmPassword to the server', async () => {
    let sentBody: unknown;

    // A one-off handler captures what actually went over the wire. Asserting on the
    // api function's arguments would only prove the test agrees with itself, and
    // confirmPassword is a UI concern that has no business in a backend log.
    server.use(
      http.post('*/auth/reset-password', async ({ request }) => {
        sentBody = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await resetPassword({
      token: DEMO_RESET_CODE,
      password: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    });

    expect(sentBody).toEqual({ token: DEMO_RESET_CODE, password: NEW_PASSWORD });
  });

  it('revokes the sessions the account already had', async () => {
    // The point of a reset: whoever else is holding a token for this account loses
    // it. Sign in, reset with a code, then prove the token still in the store is
    // dead — the request interceptor attaches it, so this is the real path.
    await authenticateTestUser();
    expect(useAuthStore.getState().tokens).not.toBeNull();

    await requestCodeForDemoUser();
    await resetPassword({
      token: DEMO_RESET_CODE,
      password: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    });

    await expect(fetchCurrentUser()).rejects.toMatchObject({ kind: 'unauthorized' });
  });
});

describe('useResetPassword', () => {
  it('clears the local session, because the server just revoked it', async () => {
    await authenticateTestUser();
    await requestCodeForDemoUser();

    const { result, queryClient } = renderHookWithQuery(() => useResetPassword());
    queryClient.setQueryData(['something'], 'cached');

    await result.current.mutateAsync({
      token: DEMO_RESET_CODE,
      password: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    });

    // Keeping the session would leave the app rendering a signed-in shell whose
    // every request 401s.
    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(useAuthStore.getState().tokens).toBeNull();
    expect(queryClient.getQueryData(['something'])).toBeUndefined();
  });

  it('leaves the session alone when the reset fails', async () => {
    await authenticateTestUser();

    const { result } = renderHookWithQuery(() => useResetPassword());

    await result.current
      .mutateAsync({
        token: 'a-code-that-was-never-issued',
        password: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
      })
      .catch(() => undefined);

    expect(useAuthStore.getState().status).toBe('authenticated');
  });
});
