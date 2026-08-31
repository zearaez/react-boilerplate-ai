import { screen } from '@testing-library/react-native';

import { renderScreen } from '~/test/render';

import { AppBugReporter } from '../bug-reporter';

/**
 * Counterpart: apps/web/src/components/__tests__/bug-reporter.test.tsx.
 *
 * Scope is deliberately the button, not the capture→annotate→form flow. Screen
 * capture is a native module (react-native-view-shot) that does not exist in
 * jest-expo, so driving the flow here would only assert that a mock returns
 * undefined. The submit path is covered for real in @repo/core against msw/node.
 *
 * `render` is AWAITED — RNTL 14 made it async.
 */
describe('AppBugReporter', () => {
  it('renders the floating button with a translated accessible label', async () => {
    await renderScreen(<AppBugReporter />);

    // Asserting on rendered English proves bugReporter.button exists in en.json.
    expect(await screen.findByLabelText('Report a bug')).toBeTruthy();
  });
});
