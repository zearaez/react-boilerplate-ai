import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';

import { requestPasswordReset } from '@repo/core';
import { DEMO_EMAIL, DEMO_RESET_CODE } from '@repo/mocks';

import { renderWithProviders } from '@/test/render';

import { ResetPasswordPage } from '../reset-password-page';

const NEW_PASSWORD = 'a-brand-new-password';

/** The mock only accepts a code that was actually issued. */
async function issueCode(): Promise<void> {
  await requestPasswordReset({ email: DEMO_EMAIL });
}

describe('ResetPasswordPage', () => {
  it('prefills the code from the link', () => {
    renderWithProviders(<ResetPasswordPage />, { route: `/?token=${DEMO_RESET_CODE}` });

    expect(screen.getByLabelText('Reset code')).toHaveValue(DEMO_RESET_CODE);
  });

  it('sets the new password and points the user at the login form', async () => {
    await issueCode();
    const user = userEvent.setup();
    renderWithProviders(<ResetPasswordPage />, { route: `/?token=${DEMO_RESET_CODE}` });

    await user.type(screen.getByLabelText('New password'), NEW_PASSWORD);
    await user.type(screen.getByLabelText('Confirm new password'), NEW_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    // Deliberately not signed in: a reset link is worth one password change, not a
    // session. See resetPassword in @repo/core.
    expect(await screen.findByRole('heading', { name: 'Password updated' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });

  it('reports a mismatch on the confirm field, not at the form root', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResetPasswordPage />, { route: `/?token=${DEMO_RESET_CODE}` });

    await user.type(screen.getByLabelText('New password'), NEW_PASSWORD);
    await user.type(screen.getByLabelText('Confirm new password'), 'something-else');
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    // superRefine attaches the issue to confirmPassword, so react-hook-form marks
    // that input invalid and renders the message beside it — rather than putting a
    // root-level alert above two inputs that both look fine.
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm new password')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('New password')).not.toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a server-rejected code on the code field', async () => {
    // No issueCode() call, so the backend has never heard of this one.
    const user = userEvent.setup();
    renderWithProviders(<ResetPasswordPage />, { route: `/?token=${DEMO_RESET_CODE}` });

    await user.type(screen.getByLabelText('New password'), NEW_PASSWORD);
    await user.type(screen.getByLabelText('Confirm new password'), NEW_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    expect(await screen.findByText(/not valid any more/i)).toBeInTheDocument();
  });

  it('requires a code when the link did not carry one', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResetPasswordPage />);

    await user.type(screen.getByLabelText('New password'), NEW_PASSWORD);
    await user.type(screen.getByLabelText('Confirm new password'), NEW_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    expect(await screen.findByText(/enter the reset code/i)).toBeInTheDocument();
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = renderWithProviders(<ResetPasswordPage />);

    const results = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'best-practice'] },
      rules: {
        region: { enabled: false },
        'landmark-one-main': { enabled: false },
        'color-contrast': { enabled: false },
      },
    });

    const summary = results.violations
      .map((violation) => `${violation.id}: ${violation.help}`)
      .join('\n');

    expect(results.violations, summary).toHaveLength(0);
  });
});
