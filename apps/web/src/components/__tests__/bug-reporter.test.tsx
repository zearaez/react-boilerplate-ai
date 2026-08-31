import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BugReporter } from '@/components/bug-reporter';

/**
 * The widget is vanilla DOM appended to document.body, not React children — so
 * these assertions deliberately query the whole screen rather than the render
 * container, which is the actual contract of mountBugReporter().
 */
describe('<BugReporter />', () => {
  it('mounts a labelled floating button outside the React tree', async () => {
    const { container } = render(<BugReporter />);

    // React renders nothing itself; everything lives on document.body.
    expect(container).toBeEmptyDOMElement();
    expect(await screen.findByRole('button', { name: 'Report a bug' })).toBeInTheDocument();
  });

  it('removes the widget on unmount, so StrictMode cannot leave two buttons', async () => {
    const { unmount } = render(<BugReporter />);
    await screen.findByRole('button', { name: 'Report a bug' });

    unmount();

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Report a bug' })).not.toBeInTheDocument();
    });
  });

  it('mounts exactly one button when rendered twice in a row', async () => {
    // Guards the real StrictMode sequence: mount, destroy, mount again.
    const first = render(<BugReporter />);
    first.unmount();
    render(<BugReporter />);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Report a bug' })).toHaveLength(1);
    });
  });
});
