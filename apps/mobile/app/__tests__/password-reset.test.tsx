import { fireEvent, screen } from '@testing-library/react-native';

import { renderScreen } from '~/test/render';

import ForgotPasswordScreen from '../(auth)/forgot-password';
import ResetPasswordScreen from '../(auth)/reset-password';

import type * as Core from '@repo/core';
import type { ReactNode } from 'react';

/**
 * Rendering and interaction only, per the documented split (docs/testing.md):
 * `msw/native` needs Hermes globals that do not exist, so the HTTP behaviour of
 * this flow is covered in @repo/core under msw/node
 * (features/auth/__tests__/password-reset.test.ts) and these tests prove the
 * screens are wired to it.
 *
 * What is deliberately NOT mocked: `resetPasswordInputSchema`. It is the shared
 * rule, and stubbing it would make this test agree with itself rather than with
 * the web counterpart.
 *
 * `mock` prefixes are required — Jest hoists jest.mock() above the file and
 * refuses to run if the factory closes over a differently-named variable.
 *
 * RNTL 14 made `render` AND `fireEvent` async. Both must be awaited.
 */
const mockRequestMutate = jest.fn();
const mockResetMutate = jest.fn();

let mockRequestSucceeded = false;
let mockResetSucceeded = false;

jest.mock('expo-router', () => ({
  // Stubbed, not requireActual'd: the real <Link> needs a navigation root that a
  // screen rendered in isolation does not have. `asChild` means the child IS the
  // rendered output, so passing children straight through is faithful enough for
  // an interaction test — navigation itself is a routing concern.
  Link: ({ children }: { children: ReactNode }) => children,
  // The screen reads `?token=` so a future deep link can prefill the code; there
  // is no router here to provide one.
  useLocalSearchParams: () => ({}),
}));

jest.mock('@repo/core', () => {
  const actual = jest.requireActual<typeof Core>('@repo/core');
  return {
    ...actual,
    useRequestPasswordReset: () => ({
      mutate: mockRequestMutate,
      isPending: false,
      isSuccess: mockRequestSucceeded,
      variables: { email: 'anisha@example.com' },
      error: null,
    }),
    useResetPassword: () => ({
      mutate: mockResetMutate,
      isPending: false,
      isSuccess: mockResetSucceeded,
      error: null,
    }),
  };
});

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    mockRequestMutate.mockClear();
    mockRequestSucceeded = false;
  });

  it('submits a valid address', async () => {
    await renderScreen(<ForgotPasswordScreen />);

    await fireEvent.changeText(screen.getByLabelText('Email'), 'anisha@example.com');
    await fireEvent.press(screen.getByRole('button', { name: /Send reset code/ }));

    expect(mockRequestMutate).toHaveBeenCalledWith(
      { email: 'anisha@example.com' },
      expect.anything(),
    );
  });

  it('blocks a malformed address without calling the api', async () => {
    await renderScreen(<ForgotPasswordScreen />);

    await fireEvent.changeText(screen.getByLabelText('Email'), 'not-an-email');
    await fireEvent.press(screen.getByRole('button', { name: /Send reset code/ }));

    // The message comes from forgotPasswordInputSchema, the same object the web
    // page validates with.
    expect(await screen.findByText(/valid email address/i)).toBeTruthy();
    expect(mockRequestMutate).not.toHaveBeenCalled();
  });

  it('does not claim an email was sent', async () => {
    mockRequestSucceeded = true;
    await renderScreen(<ForgotPasswordScreen />);

    // "If an account exists…" — the endpoint answers identically for an address
    // nobody owns, and the copy must not reveal more than the API will.
    expect(screen.getByText(/if an account exists/i)).toBeTruthy();
    expect(screen.queryByLabelText('Email')).toBeNull();
  });
});

describe('ResetPasswordScreen', () => {
  beforeEach(() => {
    mockResetMutate.mockClear();
    mockResetSucceeded = false;
  });

  it('submits the code and the new password', async () => {
    await renderScreen(<ResetPasswordScreen />);

    await fireEvent.changeText(screen.getByLabelText('Reset code'), 'reset-code-user-1');
    await fireEvent.changeText(screen.getByLabelText('New password'), 'a-brand-new-password');
    await fireEvent.changeText(
      screen.getByLabelText('Confirm new password'),
      'a-brand-new-password',
    );
    await fireEvent.press(screen.getByRole('button', { name: /Update password/ }));

    expect(mockResetMutate).toHaveBeenCalledWith(
      {
        token: 'reset-code-user-1',
        password: 'a-brand-new-password',
        confirmPassword: 'a-brand-new-password',
      },
      expect.anything(),
    );
  });

  it('reports a mismatch without calling the api', async () => {
    await renderScreen(<ResetPasswordScreen />);

    await fireEvent.changeText(screen.getByLabelText('Reset code'), 'reset-code-user-1');
    await fireEvent.changeText(screen.getByLabelText('New password'), 'a-brand-new-password');
    await fireEvent.changeText(screen.getByLabelText('Confirm new password'), 'something-else');
    await fireEvent.press(screen.getByRole('button', { name: /Update password/ }));

    expect(await screen.findByText(/passwords do not match/i)).toBeTruthy();
    expect(mockResetMutate).not.toHaveBeenCalled();
  });

  it('sends the user back to sign in rather than into the app', async () => {
    mockResetSucceeded = true;
    await renderScreen(<ResetPasswordScreen />);

    // A reset link is worth one password change, not a session.
    expect(screen.getByText(/Password updated/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Sign in/ })).toBeTruthy();
  });
});
