import { describe, expect, it } from 'vitest';

import { DEMO_PASSWORD } from '@repo/mocks';

import { getRuntime } from '../../../runtime';
import { authenticateTestUser } from '../../../test/authenticate';
import { changeMyPassword, fetchCurrentUser, login, updateMyProfile } from '../api';
import { SESSION_STORAGE_KEY, useAuthStore } from '../store';

/**
 * `PATCH /users/me` and `POST /users/me/password` — both real endpoints.
 *
 * The second one matters more than it looks: it revokes every refresh token,
 * including this session's. That is the only server-side revocation the API
 * offers, so it is the real "sign out everywhere" — and a client that carries on
 * afterwards is running on a token the server has disowned.
 */
describe('updateMyProfile', () => {
  it('saves the name and phone and returns the updated user', async () => {
    await authenticateTestUser();

    const updated = await updateMyProfile({
      name: 'Anisha Shrestha-Rai',
      phone: '+977 9812 345678',
    });

    expect(updated.name).toBe('Anisha Shrestha-Rai');
    expect(updated.phone).toBe('+977 9812 345678');

    // And it really persisted server-side, not just in the response.
    expect((await fetchCurrentUser()).name).toBe('Anisha Shrestha-Rai');
  });

  it('clears a phone number when given null', async () => {
    // Null is a legitimate value: "no phone" and "empty phone" are different
    // things, and the schema keeps them apart.
    await authenticateTestUser();

    const updated = await updateMyProfile({
      name: 'Anisha Shrestha',
      phone: null,
    });

    expect(updated.phone).toBeNull();
  });

  it('takes the user id from the session, not the caller', async () => {
    // The command carries user_id, so a caller who could set it could patch
    // someone else. There is deliberately no way to pass one in.
    await authenticateTestUser();

    const updated = await updateMyProfile({ name: 'Renamed', phone: null });

    expect(updated.id).toBe(useAuthStore.getState().user?.id);
  });

  it('refuses without a session rather than sending a request', async () => {
    await expect(updateMyProfile({ name: 'Nobody', phone: null })).rejects.toMatchObject({
      kind: 'unauthorized',
    });
  });

  it('validates before sending', async () => {
    await authenticateTestUser();

    await expect(updateMyProfile({ name: '   ', phone: null })).rejects.toMatchObject({
      kind: 'validation',
    });
  });
});

describe('changeMyPassword', () => {
  it('changes the password, and the new one works', async () => {
    await authenticateTestUser();
    const email = useAuthStore.getState().user?.email ?? '';

    await changeMyPassword({
      currentPassword: DEMO_PASSWORD,
      newPassword: 'brand-new-pass',
      confirmPassword: 'brand-new-pass',
    });

    const session = await login({ email, password: 'brand-new-pass' });
    expect(session.user.email).toBe(email);
  });

  it('REVOKES the session it was called with', async () => {
    // The consequence that makes this endpoint different from every other
    // mutation: succeeding ends the caller's own session server-side.
    await authenticateTestUser();

    await changeMyPassword({
      currentPassword: DEMO_PASSWORD,
      newPassword: 'another-new-pass',
      confirmPassword: 'another-new-pass',
    });

    // The old access token is dead, so any further call fails.
    await expect(fetchCurrentUser()).rejects.toMatchObject({ kind: 'unauthorized' });
  });

  it('rejects a wrong current password with a field error', async () => {
    await authenticateTestUser();

    await expect(
      changeMyPassword({
        currentPassword: 'not-my-password',
        newPassword: 'a-good-new-one',
        confirmPassword: 'a-good-new-one',
      }),
    ).rejects.toMatchObject({ kind: 'validation' });
  });

  it('rejects a mismatched confirmation locally, on the field that is wrong', async () => {
    await authenticateTestUser();

    await expect(
      changeMyPassword({
        currentPassword: DEMO_PASSWORD,
        newPassword: 'a-good-new-one',
        confirmPassword: 'typo',
      }),
    ).rejects.toMatchObject({
      kind: 'validation',
      fieldErrors: { confirmPassword: ['Those passwords do not match.'] },
    });
  });

  it('refuses to reuse the current password', async () => {
    await authenticateTestUser();

    await expect(
      changeMyPassword({
        currentPassword: DEMO_PASSWORD,
        newPassword: DEMO_PASSWORD,
        confirmPassword: DEMO_PASSWORD,
      }),
    ).rejects.toMatchObject({ kind: 'validation' });
  });
});

describe('setUser', () => {
  it('persists the updated user alongside the existing tokens', async () => {
    // Without this the header would keep showing the old name until the next
    // cold start, because the session in storage would be stale.
    await authenticateTestUser();
    const user = useAuthStore.getState().user;

    await useAuthStore.getState().setUser({ ...user!, name: 'Persisted Name' });

    const raw = await getRuntime().storage.get(SESSION_STORAGE_KEY);
    expect(raw).toContain('Persisted Name');
    expect(useAuthStore.getState().tokens).not.toBeNull();
  });
});
