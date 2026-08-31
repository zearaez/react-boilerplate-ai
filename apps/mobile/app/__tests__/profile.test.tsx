import { fireEvent, screen } from '@testing-library/react-native';

import { renderScreen } from '~/test/render';

import ProfileScreen from '../(app)/profile';

import type * as Core from '@repo/core';
import type { Profile } from '@repo/core';

/**
 * REFERENCE TEST: a mobile form with a conditional field.
 *
 * The data hooks are mocked rather than served by MSW, which is the documented
 * split for this repo (docs/testing.md): `msw/native` needs Hermes globals that do
 * not exist, so all HTTP-level behaviour is tested in @repo/core under msw/node and
 * mobile tests cover rendering and interaction.
 *
 * Note the `mock` prefixes: Jest hoists jest.mock() above the file, so any
 * variable its factory references must be named `mock*` or Jest refuses to run
 * the suite.
 *
 * RNTL 14 made `render` AND `fireEvent` async — both must be awaited.
 *
 * What is deliberately NOT mocked: the zod schema and `isPhoneRelevant`. Those are
 * the shared rules, and stubbing them would make the test agree with itself rather
 * than with the web counterpart.
 */
const mockProfile: Profile = {
  id: 'user-1',
  displayName: 'Anisha Shrestha',
  email: 'anisha@example.com',
  phone: '',
  notificationChannel: 'email',
  marketingOptIn: false,
};

const mockMutate = jest.fn();

jest.mock('@repo/core', () => {
  // Typed, because requireActual returns `any` and spreading it would leak an
  // `any` through the whole mocked module.
  const actual = jest.requireActual<typeof Core>('@repo/core');
  return {
    ...actual,
    useProfileQuery: () => ({ data: mockProfile, isPending: false, isError: false, error: null }),
    useUpdateProfile: () => ({
      mutate: mockMutate,
      isPending: false,
      isSuccess: false,
      error: null,
    }),
  };
});

describe('ProfileScreen', () => {
  beforeEach(() => {
    mockMutate.mockClear();
  });

  it('populates from the query', async () => {
    await renderScreen(<ProfileScreen />);

    expect(screen.getByDisplayValue('Anisha Shrestha')).toBeTruthy();
    expect(screen.getByDisplayValue('anisha@example.com')).toBeTruthy();
  });

  it('shows the phone field only when SMS is selected', async () => {
    await renderScreen(<ProfileScreen />);

    expect(screen.queryByText('Phone number')).toBeNull();

    // The channel selector is a row of radio-role Pressables, not a picker.
    await fireEvent.press(screen.getByRole('radio', { name: 'SMS' }));

    expect(await screen.findByText('Phone number')).toBeTruthy();
  });

  it('hides the phone field again when the channel changes back', async () => {
    await renderScreen(<ProfileScreen />);

    await fireEvent.press(screen.getByRole('radio', { name: 'SMS' }));
    expect(await screen.findByText('Phone number')).toBeTruthy();

    await fireEvent.press(screen.getByRole('radio', { name: 'Email' }));
    expect(screen.queryByText('Phone number')).toBeNull();
  });

  it('marks the selected channel for assistive technology', async () => {
    await renderScreen(<ProfileScreen />);

    // accessibilityState.selected, so a screen reader announces which is active —
    // colour alone would not.
    expect(screen.getByRole('radio', { name: 'Email' }).props.accessibilityState.selected).toBe(
      true,
    );
    expect(screen.getByRole('radio', { name: 'SMS' }).props.accessibilityState.selected).toBe(
      false,
    );
  });

  it('keeps save disabled until the form is dirty', async () => {
    await renderScreen(<ProfileScreen />);

    const save = screen.getByRole('button', { name: /Save changes/ });
    expect(save.props.accessibilityState.disabled).toBe(true);
  });

  it('exposes the email field as read-only', async () => {
    await renderScreen(<ProfileScreen />);

    expect(screen.getByDisplayValue('anisha@example.com').props.editable).toBe(false);
  });
});
