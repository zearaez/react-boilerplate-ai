import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { signInTestUser } from '@/test/auth';
import { renderWithProviders } from '@/test/render';

import { ProfilePage } from '../profile-page';

/**
 * REFERENCE TEST: a single-resource form with conditional and cross-field rules.
 *
 * The three things worth asserting on any form like this, and the three an agent is
 * most likely to get wrong:
 *   1. the form is populated from the query (not left empty by stale defaultValues)
 *   2. a conditional field appears and disappears with its trigger
 *   3. a cross-field error lands on the field the user must fix
 */
beforeEach(async () => {
  await signInTestUser();
});

async function waitForForm() {
  await waitFor(() => {
    expect(screen.getByLabelText('Display name')).toBeInTheDocument();
  });
}

describe('ProfilePage', () => {
  it('populates the form from the query rather than leaving it empty', async () => {
    renderWithProviders(<ProfilePage />);
    await waitForForm();

    // defaultValues is captured before the fetch resolves, so this only passes
    // because of the reset-on-data effect.
    expect(screen.getByLabelText<HTMLInputElement>('Display name').value).toBe('Anisha Shrestha');
    expect(screen.getByLabelText<HTMLInputElement>('Email').value).toBe('anisha@example.com');
  });

  it('shows the email read-only, rather than hiding it', async () => {
    renderWithProviders(<ProfilePage />);
    await waitForForm();

    expect(screen.getByLabelText('Email')).toBeDisabled();
  });

  it('disables save until something actually changes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);
    await waitForForm();

    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();

    await user.type(screen.getByLabelText('Display name'), '!');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  });

  it('reveals the phone field only when the channel is SMS', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);
    await waitForForm();

    // Hidden for the default 'email' channel.
    expect(screen.queryByLabelText('Phone number')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Notify me by'), 'sms');
    expect(await screen.findByLabelText('Phone number')).toBeInTheDocument();

    // ...and hidden again when the trigger changes back.
    await user.selectOptions(screen.getByLabelText('Notify me by'), 'email');
    await waitFor(() => {
      expect(screen.queryByLabelText('Phone number')).not.toBeInTheDocument();
    });
  });

  it('blocks an SMS channel with no phone number, with the error on the phone field', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);
    await waitForForm();

    await user.selectOptions(screen.getByLabelText('Notify me by'), 'sms');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    // Message and placement both come from superRefine's `path: ['phone']`.
    expect(await screen.findByText(/Add a phone number/i)).toBeInTheDocument();
  });

  it('reports the marketing/channel contradiction on the channel field', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);
    await waitForForm();

    // The fixture starts with marketingOptIn true, so selecting 'none' is a
    // contradiction the schema must catch.
    await user.selectOptions(screen.getByLabelText('Notify me by'), 'none');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText(/Choose a channel to receive marketing/i)).toBeInTheDocument();
  });

  it('saves a valid change and confirms it', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);
    await waitForForm();

    const name = screen.getByLabelText('Display name');
    await user.clear(name);
    await user.type(name, 'Ada L.');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('accepts SMS once a valid phone number is supplied', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);
    await waitForForm();

    await user.selectOptions(screen.getByLabelText('Notify me by'), 'sms');
    await user.type(await screen.findByLabelText('Phone number'), '+977 9801 234567');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });
});
