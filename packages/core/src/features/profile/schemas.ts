import { z } from 'zod';

/**
 * REFERENCE: cross-field and conditional validation.
 *
 * `posts` only demonstrates independent per-field rules. Real forms usually have
 * rules that span fields — "phone is required, but only when the channel is SMS" —
 * and that is where agents most often invent something ad hoc, typically by
 * checking in the component and letting the schema and the UI disagree.
 *
 * The rule for this repo: **if a constraint can be expressed in the schema, it
 * belongs in the schema.** Both platforms get it for free, the api layer enforces
 * it before the network, and the error lands on a named field.
 */

export const NOTIFICATION_CHANNELS = ['email', 'sms', 'none'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const profileSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.email(),
  /** E.164-ish. Empty string means "not provided" — see the note in the input schema. */
  phone: z.string(),
  notificationChannel: z.enum(NOTIFICATION_CHANNELS),
  marketingOptIn: z.boolean(),
});

export type Profile = z.infer<typeof profileSchema>;

/**
 * The editable subset. Note `phone` is a plain string rather than `.optional()`:
 * an HTML input and a React Native TextInput both produce `''` when cleared, never
 * `undefined`, so modelling it as optional means every consumer has to handle two
 * "empty" values. One representation is simpler and matches what the platforms
 * actually give you.
 */
const baseUpdateProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, { message: 'Display name must be at least 2 characters.' })
    .max(60, { message: 'Display name must be 60 characters or fewer.' }),
  phone: z.string().trim(),
  notificationChannel: z.enum(NOTIFICATION_CHANNELS),
  marketingOptIn: z.boolean(),
});

/**
 * `superRefine` rather than `.refine()`, because it can attach the error to a
 * SPECIFIC field via `path`. A bare `.refine()` puts the message at the form root,
 * where react-hook-form cannot show it next to the input the user has to fix — and
 * an error the user cannot locate is barely better than no error.
 */
export const updateProfileInputSchema = baseUpdateProfileSchema.superRefine((value, ctx) => {
  if (value.notificationChannel === 'sms' && value.phone.length === 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['phone'],
      message: 'Add a phone number to receive SMS notifications.',
    });
  }

  // A number that is present must still be plausible, whichever channel is chosen.
  if (value.phone.length > 0 && !/^\+?[0-9 ()-]{7,20}$/.test(value.phone)) {
    ctx.addIssue({
      code: 'custom',
      path: ['phone'],
      message: 'Enter a valid phone number.',
    });
  }

  // Cross-field consistency: opting into marketing with no reachable channel is a
  // contradiction the backend would otherwise have to reject.
  if (value.marketingOptIn && value.notificationChannel === 'none') {
    ctx.addIssue({
      code: 'custom',
      path: ['notificationChannel'],
      message: 'Choose a channel to receive marketing updates, or opt out.',
    });
  }
});

export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;

/**
 * Which fields the UI should show for a given channel.
 *
 * Exported from core so web and mobile cannot disagree about it. Both platforms
 * render very different markup; what they must share is *when* a field is
 * relevant.
 */
export function isPhoneRelevant(channel: NotificationChannel): boolean {
  return channel === 'sms';
}
