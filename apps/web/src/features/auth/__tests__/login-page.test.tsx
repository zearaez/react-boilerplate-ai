import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';

import { useAuthStore } from '@repo/core';
import { DEMO_EMAIL, DEMO_PASSWORD } from '@repo/mocks';

import { renderWithProviders } from '@/test/render';

import { LoginPage } from '../login-page';

describe('LoginPage', () => {
  it('signs in with the demo credentials', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), DEMO_EMAIL);
    await user.type(screen.getByLabelText('Password'), DEMO_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(useAuthStore.getState().status).toBe('authenticated');
    });
  });

  it('shows the server message on bad credentials without signing in', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), DEMO_EMAIL);
    await user.type(screen.getByLabelText('Password'), 'wrong-password-1');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    // The server's own wording, surfaced verbatim — see the i18n note in
    // docs/api/README.md about server messages not being translatable.
    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid email or password/i);
    expect(useAuthStore.getState().status).not.toBe('authenticated');
  });

  it('validates client-side before hitting the network', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    // Both messages come from loginInputSchema in @repo/core — the same schema
    // the mobile login screen uses.
    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  /**
   * Rendered-DOM accessibility check (audit item 12.3). This complements the
   * token-level contrast test in @repo/tokens: that one proves the palette can
   * meet AA, this one proves the markup is actually labelled and structured.
   */
  it('has no detectable accessibility violations', async () => {
    const { container } = renderWithProviders(<LoginPage />);

    const results = await axe.run(container, {
      // 'best-practice' is included alongside the WCAG tags on purpose: the rule
      // that catches a page with no <h1> (page-has-heading-one) lives there, not in
      // wcag2a/aa. This screen shipped without a heading because shadcn's CardTitle
      // renders a <div>, and only the Playwright spec noticed.
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'best-practice'] },
      rules: {
        // Not applicable to a component rendered in isolation: there is no <main>
        // landmark or unique page context inside a test container.
        region: { enabled: false },
        'landmark-one-main': { enabled: false },
        // jsdom has no canvas, so axe cannot sample pixels and this rule is
        // skipped rather than passed. Disabling it explicitly keeps the result
        // honest — contrast IS covered, by the token-level WCAG test in
        // packages/tokens/src/__tests__/contrast.test.ts.
        'color-contrast': { enabled: false },
      },
    });

    const summary = results.violations
      .map((violation) => `${violation.id}: ${violation.help}`)
      .join('\n');

    expect(results.violations, summary).toHaveLength(0);
  });
});
