import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { ApiError } from '../../../api/errors';
import { authenticateTestUser } from '../../../test/authenticate';
import { renderHookWithQuery } from '../../../test/render-hook';
import { useProfileQuery, useUpdateProfile } from '../hooks';
import { profileKeys } from '../keys';
import { isPhoneRelevant, updateProfileInputSchema } from '../schemas';

import type { Profile, UpdateProfileInput } from '../schemas';

const valid: UpdateProfileInput = {
  displayName: 'Anisha Shrestha',
  phone: '',
  notificationChannel: 'email',
  marketingOptIn: true,
};

describe('updateProfileInputSchema — cross-field rules', () => {
  it('accepts a consistent profile', () => {
    expect(updateProfileInputSchema.safeParse(valid).success).toBe(true);
  });

  it('requires a phone number when the channel is SMS, attached to the phone field', () => {
    const result = updateProfileInputSchema.safeParse({
      ...valid,
      notificationChannel: 'sms',
      phone: '',
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    // `path` is the whole point of superRefine over refine: the error has to land
    // on the field the user must fix, or the form cannot show it.
    expect(result.error.issues[0]?.path).toEqual(['phone']);
    expect(result.error.issues[0]?.message).toMatch(/phone number/i);
  });

  it('accepts SMS once a phone number is present', () => {
    expect(
      updateProfileInputSchema.safeParse({
        ...valid,
        notificationChannel: 'sms',
        phone: '+977 9801 234567',
      }).success,
    ).toBe(true);
  });

  it('rejects an implausible phone number whichever channel is chosen', () => {
    const result = updateProfileInputSchema.safeParse({ ...valid, phone: 'not-a-number' });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.path).toEqual(['phone']);
  });

  it('rejects marketing opt-in with no reachable channel, on the channel field', () => {
    const result = updateProfileInputSchema.safeParse({
      ...valid,
      notificationChannel: 'none',
      marketingOptIn: true,
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.path).toEqual(['notificationChannel']);
  });

  it('allows opting out entirely', () => {
    expect(
      updateProfileInputSchema.safeParse({
        ...valid,
        notificationChannel: 'none',
        marketingOptIn: false,
      }).success,
    ).toBe(true);
  });
});

describe('isPhoneRelevant', () => {
  it('is the single source of truth for showing the phone field', () => {
    // Both apps call this rather than each testing the channel themselves, so they
    // cannot disagree about when the field is visible.
    expect(isPhoneRelevant('sms')).toBe(true);
    expect(isPhoneRelevant('email')).toBe(false);
    expect(isPhoneRelevant('none')).toBe(false);
  });
});

describe('useProfileQuery', () => {
  beforeEach(async () => {
    await authenticateTestUser();
  });

  it('loads the single resource', async () => {
    const { result } = renderHookWithQuery(() => useProfileQuery());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.email).toBe('anisha@example.com');
  });
});

describe('useUpdateProfile', () => {
  beforeEach(async () => {
    await authenticateTestUser();
  });

  it('applies the change and accepts the server version', async () => {
    const { result, queryClient } = renderHookWithQuery(() => useUpdateProfile());

    const updated = await result.current.mutateAsync({ ...valid, displayName: 'Ada L.' });

    expect(updated.displayName).toBe('Ada L.');
    expect(queryClient.getQueryData<Profile>(profileKeys.current())?.displayName).toBe('Ada L.');
  });

  it('rolls the single cache entry back when the server rejects it', async () => {
    const { result, queryClient } = renderHookWithQuery(() => useUpdateProfile());

    const original: Profile = {
      id: 'user-1',
      displayName: 'Anisha Shrestha',
      email: 'anisha@example.com',
      phone: '',
      notificationChannel: 'email',
      marketingOptIn: true,
    };
    queryClient.setQueryData(profileKeys.current(), original);

    // The mock enforces the same SMS-needs-a-phone rule the client does, so this
    // exercises the server path rather than only the client guard.
    await expect(
      result.current.mutateAsync({ ...valid, notificationChannel: 'sms', phone: '' }),
    ).rejects.toBeInstanceOf(ApiError);

    await waitFor(() => {
      expect(queryClient.getQueryData<Profile>(profileKeys.current())?.notificationChannel).toBe(
        'email',
      );
    });
  });

  it('surfaces the server field error on the phone field', async () => {
    const { result } = renderHookWithQuery(() => useUpdateProfile());

    // Bypasses the client schema to prove the server contract is handled too.
    const error = await result.current
      .mutateAsync({ ...valid, notificationChannel: 'sms', phone: '' })
      .then(() => null)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).fieldErrors).toHaveProperty('phone');
  });
});
