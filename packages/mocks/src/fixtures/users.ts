/**
 * Fixture users. Passwords are plaintext here BECAUSE this is a fake backend
 * that never runs in production — see packages/mocks/README.md. Never copy this
 * pattern into real code.
 */
/**
 * Mirrors the API's user payload, snake_case and all — the mock is only useful if
 * it is wrong in the same ways the real server is. `password` is the one field
 * the API never returns.
 */
export interface MockUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'member' | 'admin';
  created_at: string;
  password: string;
}

export const users: MockUser[] = [
  {
    id: 'user-1',
    name: 'Anisha Shrestha',
    email: 'anisha@example.com',
    phone: '+977 9801 234567',
    role: 'admin',
    created_at: '2026-01-04T09:00:00.000Z',
    password: 'password123',
  },
  {
    id: 'user-2',
    name: 'Bikash Tamang',
    email: 'bikash@example.com',
    // Null, not '': the API types phone as nullable, and a fixture that never
    // exercises the null branch is how a `.trim()` on undefined ships.
    phone: null,
    role: 'member',
    created_at: '2026-02-11T14:30:00.000Z',
    password: 'password123',
  },
];

/** The account the login screen hints at, so the demo works on first run. */
export const DEMO_EMAIL = 'anisha@example.com';
export const DEMO_PASSWORD = 'password123';

/**
 * The reset code this fake backend issues for a user.
 *
 * DERIVED, not random, because there is no inbox in a demo and a flow you cannot
 * finish teaches nothing. It is still only *accepted* after a real request to
 * /api/auth/forgot-password, so the "you must ask first" half of the flow is
 * genuinely exercised. A real backend issues an unguessable single-use token —
 * never copy this.
 */
export function resetCodeForUser(userId: string): string {
  return `reset-code-${userId}`;
}

/** The code the reset screen hints at, matching auth.resetDemoHint in en.json. */
export const DEMO_RESET_CODE = resetCodeForUser('user-1');

export function publicUser(user: MockUser): Omit<MockUser, 'password'> {
  const { password: _password, ...rest } = user;
  return rest;
}
