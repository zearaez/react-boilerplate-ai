import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';

import { DEMO_EMAIL } from '@repo/mocks';

import { renderWithProviders } from '@/test/render';

import { ForgotPasswordPage } from '../forgot-password-page';

describe('ForgotPasswordPage', () => {
  it('confirms the request without confirming the account exists', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText('Email'), DEMO_EMAIL);
    await user.click(screen.getByRole('button', { name: 'Send reset code' }));

    const status = await screen.findByRole('status');
    // "If an account exists…", not "we sent you an email". The endpoint answers the
    // same way for an address nobody owns, so the copy must not claim more than the
    // API is willing to reveal.
    expect(status).toHaveTextContent(/if an account exists/i);
    expect(status).toHaveTextContent(DEMO_EMAIL);
  });

  it('says the same thing for an address with no account', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText('Email'), 'nobody@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset code' }));

    expect(await screen.findByRole('status')).toHaveTextContent(/if an account exists/i);
  });

  it('validates the address client-side before hitting the network', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Send reset code' }));

    // The message comes from forgotPasswordInputSchema in @repo/core — the same
    // schema the mobile screen uses.
    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('offers a way to the code form once a request is made', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText('Email'), DEMO_EMAIL);
    await user.click(screen.getByRole('button', { name: 'Send reset code' }));

    expect(await screen.findByRole('link', { name: 'I have a code' })).toHaveAttribute(
      'href',
      '/reset-password',
    );
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = renderWithProviders(<ForgotPasswordPage />);

    const results = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'best-practice'] },
      rules: {
        // Same three exclusions as the login page spec, for the same reasons:
        // no page context in a test container, and jsdom has no canvas so axe
        // cannot sample pixels (contrast is covered by the token-level test).
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
