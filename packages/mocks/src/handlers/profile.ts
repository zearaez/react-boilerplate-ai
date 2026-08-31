import { HttpResponse, http } from 'msw';

import { registerReset, userFromAuthHeader } from '../db';
import { type MockProfile, initialProfile } from '../fixtures/profile';

let profile: MockProfile = { ...initialProfile };

export function resetProfile(): void {
  profile = { ...initialProfile };
}

registerReset(resetProfile);

interface ProfileBody {
  displayName?: unknown;
  phone?: unknown;
  notificationChannel?: unknown;
  marketingOptIn?: unknown;
}

const CHANNELS = new Set(['email', 'sms', 'none']);

export const profileHandlers = [
  http.get('*/api/profile', ({ request }) => {
    if (!userFromAuthHeader(request.headers.get('Authorization'))) {
      return HttpResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }
    return HttpResponse.json(profile);
  }),

  http.patch('*/api/profile', async ({ request }) => {
    if (!userFromAuthHeader(request.headers.get('Authorization'))) {
      return HttpResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const body = (await request.json()) as ProfileBody;

    // The mock enforces the same cross-field rule the client does. A mock that is
    // laxer than the server lets a client-side-only guard look like a real one.
    const channel =
      typeof body.notificationChannel === 'string' && CHANNELS.has(body.notificationChannel)
        ? (body.notificationChannel as MockProfile['notificationChannel'])
        : profile.notificationChannel;
    const phone = typeof body.phone === 'string' ? body.phone.trim() : profile.phone;

    if (channel === 'sms' && phone.length === 0) {
      return HttpResponse.json(
        {
          message: 'Validation failed.',
          errors: { phone: ['Add a phone number to receive SMS notifications.'] },
        },
        { status: 422 },
      );
    }

    profile = {
      ...profile,
      ...(typeof body.displayName === 'string' ? { displayName: body.displayName.trim() } : {}),
      phone,
      notificationChannel: channel,
      ...(typeof body.marketingOptIn === 'boolean' ? { marketingOptIn: body.marketingOptIn } : {}),
    };

    return HttpResponse.json(profile);
  }),
];
