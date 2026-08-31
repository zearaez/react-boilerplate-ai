import { z } from 'zod';

/**
 * zod schemas are the single source of truth: they produce the TypeScript type,
 * validate the form, AND parse the API response at runtime. Never hand-write an
 * interface next to a schema — derive it with z.infer.
 */

/**
 * The roles the API issues. Ordered from least to most privileged — do not sort
 * alphabetically, the order is the documentation.
 *
 * Add a role here and both apps see it: the nav's `roles` filter, the header's
 * role label (`common.roles.*` in en.json) and every `zod.parse` of a user read
 * from this one list.
 */
export const USER_ROLES = ['member', 'admin'] as const;

export type UserRole = (typeof USER_ROLES)[number];

/**
 * `GET /users/me` → the signed-in user.
 *
 * The wire is snake_case; this is the one place that is true. Everything
 * downstream sees camelCase, because a `created_at` leaking into a component is
 * how a codebase ends up with both spellings of every field.
 */
export const userSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.email(),
    // Nullable on the wire, and genuinely absent for accounts created without
    // one — kept as `null` rather than coerced to '' so "no phone" and "empty
    // phone" stay distinguishable.
    phone: z.string().nullable(),
    role: z.enum(USER_ROLES),
    created_at: z.iso.datetime({ offset: true }),
  })
  .transform((raw) => ({
    id: raw.id,
    name: raw.name,
    email: raw.email,
    phone: raw.phone,
    role: raw.role,
    createdAt: raw.created_at,
  }));

export type User = z.infer<typeof userSchema>;

/**
 * `POST /auth/login` and `POST /auth/refresh` → `AuthTokenResponse`.
 *
 * Note what is NOT here: the user. Login returns credentials only, so a session
 * takes two round trips (see `login()` in api.ts). The expiry timestamps are what
 * make proactive refresh possible instead of waiting for a 401.
 */
export const authTokensSchema = z
  .object({
    access_token: z.string().min(1),
    access_token_expires_at: z.iso.datetime({ offset: true }),
    /**
     * OPTIONAL, and this is the httpOnly-cookie contract showing through.
     *
     * Under that contract the refresh token is delivered as a `Set-Cookie` the
     * browser holds and JavaScript cannot read, so the server is free to omit it
     * from the body — and on web it MUST, or the credential is back in reach of
     * an XSS payload. The server still sends it today, and mobile still needs it
     * (a native cookie jar is not a credential store we control), so the field
     * is optional rather than gone. See docs/api/auth-cookie-contract.md.
     */
    refresh_token: z.string().min(1).optional(),
    refresh_token_expires_at: z.iso.datetime({ offset: true }).optional(),
  })
  .transform((raw) => ({
    accessToken: raw.access_token,
    accessTokenExpiresAt: raw.access_token_expires_at,
    refreshToken: raw.refresh_token,
    refreshTokenExpiresAt: raw.refresh_token_expires_at,
  }));

export type AuthTokens = z.infer<typeof authTokensSchema>;

/**
 * What gets persisted and rehydrated on next launch.
 *
 * Built by the client, never returned whole by the server — so it is a plain
 * object schema over already-camelCased parts, not another wire transform.
 */
export const sessionSchema = z.object({
  /**
   * The transform is not decoration. `.optional()` makes the KEY optional, and an
   * optional key is not assignable to `AuthTokens`, whose keys are present with a
   * `string | undefined` value — so without this, a parsed session cannot be put
   * back into the store. Restating the fields normalises "absent" to "present and
   * undefined", which is the one shape the rest of the code handles.
   */
  tokens: z
    .object({
      accessToken: z.string().min(1),
      accessTokenExpiresAt: z.string(),
      // Optional for the same reason as the wire schema above: a cookie-borne
      // refresh token is never in JS's hands, so there is nothing to persist.
      refreshToken: z.string().min(1).optional(),
      refreshTokenExpiresAt: z.string().optional(),
    })
    .transform((raw) => ({
      accessToken: raw.accessToken,
      accessTokenExpiresAt: raw.accessTokenExpiresAt,
      refreshToken: raw.refreshToken,
      refreshTokenExpiresAt: raw.refreshTokenExpiresAt,
    })),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    phone: z.string().nullable(),
    role: z.enum(USER_ROLES),
    createdAt: z.string(),
  }),
});

export type Session = z.infer<typeof sessionSchema>;

/**
 * The email rule and the password rule, each defined once.
 *
 * Sign-in and password-reset MUST agree: a minimum the login form enforces but
 * the reset form does not is a rule that only looks enforced — a user could set
 * a four-character password through the back door and then be unable to explain
 * why the sign-in form rejects it.
 */
const emailSchema = z.email({ message: 'Enter a valid email address.' });
// 8+ characters per NIST, which is also audit item 8.7.
const passwordSchema = z.string().min(8, { message: 'Password must be at least 8 characters.' });

export const loginInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const forgotPasswordInputSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordInputSchema>;

/**
 * The response to a reset request. `status` is 'sent' whether or not the address
 * belongs to an account, and that is the point, not an oversight: a 404 for
 * unknown addresses turns this endpoint into an account-enumeration oracle.
 *
 * The consequence for the UI: it must never claim an email *was* sent. Both
 * platforms render `auth.resetLinkSent`, which is phrased "if an account
 * exists" for exactly this reason.
 */
export const passwordResetRequestedSchema = z.object({
  status: z.literal('sent'),
});

export type PasswordResetRequested = z.infer<typeof passwordResetRequestedSchema>;

const baseResetPasswordInputSchema = z.object({
  /**
   * The code from the reset email. Web reads it from `?token=`, mobile has it
   * pasted — hence a validated form field rather than a hidden input, so both
   * platforms can report a missing one the same way.
   */
  token: z.string().trim().min(1, { message: 'Enter the reset code from your email.' }),
  password: passwordSchema,
  /** UI-only: stripped in api.ts, never sent. It exists so the rule below can. */
  confirmPassword: z.string(),
});

/**
 * `superRefine` rather than `.refine()`, for the reason spelled out in
 * features/profile/schemas.ts: `path` attaches the error to the field the user
 * has to fix. A mismatch reported at the form root leaves both password inputs
 * looking equally valid.
 */
export const resetPasswordInputSchema = baseResetPasswordInputSchema.superRefine((value, ctx) => {
  if (value.confirmPassword !== value.password) {
    ctx.addIssue({
      code: 'custom',
      path: ['confirmPassword'],
      message: 'Those passwords do not match.',
    });
  }
});

export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;

/**
 * `PATCH /users/me`.
 *
 * Two fields, and note what is NOT among them: EMAIL. The API offers no way to
 * change it, which is why the profile screen shows it read-only with a "contact
 * support" hint rather than an editable input.
 *
 * `user_id` is in the command but not here — the api layer reads it from the
 * session. A form that carried its own user id could be made to patch someone
 * else's profile.
 */
export const updateMyProfileInputSchema = z.object({
  name: z.string().trim().min(1, { message: 'Enter your name.' }),
  /** Nullable on the wire: clearing a phone number is legitimate. */
  phone: z.string().trim().nullable(),
});

export type UpdateMyProfileInput = z.infer<typeof updateMyProfileInputSchema>;

/**
 * `POST /users/me/password`.
 *
 * Succeeding here REVOKES EVERY REFRESH TOKEN, including this session's, so the
 * caller must treat a success as "signed out everywhere" and re-authenticate.
 * That is the only server-side revocation the API offers — see the note on
 * `logout()` in api.ts.
 *
 * `confirmPassword` is UI-only and stripped before the request; the rule below is
 * the reason it exists at all.
 */
const baseChangePasswordInputSchema = z.object({
  currentPassword: z.string().min(1, { message: 'Enter your current password.' }),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
});

export const changePasswordInputSchema = baseChangePasswordInputSchema.superRefine((value, ctx) => {
  // superRefine with a path, not .refine(): the error has to land on the field
  // the user must fix. See features/profile/schemas.ts.
  if (value.confirmPassword !== value.newPassword) {
    ctx.addIssue({
      code: 'custom',
      path: ['confirmPassword'],
      message: 'Those passwords do not match.',
    });
  }

  if (value.newPassword === value.currentPassword) {
    ctx.addIssue({
      code: 'custom',
      path: ['newPassword'],
      message: 'Choose a password you have not used here before.',
    });
  }
});

export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;
