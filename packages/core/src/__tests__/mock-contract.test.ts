import { describe, expect, it } from 'vitest';

import { DEMO_EMAIL, DEMO_PASSWORD, DEMO_RESET_CODE, initialPosts, users } from '@repo/mocks';

import { getApiClient } from '../api/client';
import {
  authTokensSchema,
  passwordResetRequestedSchema,
  userSchema,
} from '../features/auth/schemas';
import { postPageSchema, postSchema } from '../features/posts/schemas';
import { resources } from '../i18n';
import { authenticateTestUser } from '../test/authenticate';

/**
 * THE CROSS-PACKAGE CONTRACT TEST.
 *
 * @repo/mocks deliberately imports nothing from @repo/core — it is a standalone
 * fake backend, so there is no type-level link between the two and no package
 * cycle. This suite is what replaces that link, and it is stronger than a type
 * import would be: it asserts at RUNTIME that what the mock actually sends over
 * the wire satisfies the schemas the app parses with.
 *
 * If someone adds a field to a zod schema and forgets the handler (or vice
 * versa), this fails immediately instead of at the first screen that renders it.
 */
describe('mock backend satisfies core schemas', () => {
  it('every seeded post matches postSchema', () => {
    for (const post of initialPosts) {
      const result = postSchema.safeParse(post);
      expect(
        result.success,
        `Fixture ${post.id} does not match postSchema: ${
          result.success ? '' : JSON.stringify(result.error.issues)
        }`,
      ).toBe(true);
    }
  });

  it('every fixture user matches userSchema once the password is stripped', () => {
    for (const user of users) {
      const { password: _password, ...rest } = user;
      expect(userSchema.safeParse(rest).success).toBe(true);
    }
  });

  it('POST /auth/login returns a token pair and NO user', async () => {
    const response = await getApiClient().post('/auth/login', {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });

    expect(authTokensSchema.safeParse(response.data).success).toBe(true);
    // The absence is the contract: it is why login() makes a second call to
    // /users/me. A mock that started returning a user here would let that round
    // trip be deleted and only break against the real server.
    expect(response.data).not.toHaveProperty('user');
  });

  it('login never leaks the password field', async () => {
    const response = await getApiClient().post('/auth/login', {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });

    expect(JSON.stringify(response.data)).not.toContain(DEMO_PASSWORD);
  });

  it('GET /users/me returns a body matching userSchema', async () => {
    await authenticateTestUser();

    const response = await getApiClient().get('/users/me');
    const result = userSchema.safeParse(response.data);

    expect(result.success, result.success ? '' : JSON.stringify(result.error.issues)).toBe(true);
  });

  it('POST /auth/refresh rotates: the old refresh token stops working', async () => {
    // Rotation is why the 401 interceptor refreshes single-flight. If the mock
    // stopped rotating, that safeguard would look unnecessary and get removed.
    const login = await getApiClient().post('/auth/login', {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    const first = authTokensSchema.parse(login.data);

    const refreshed = await getApiClient().post('/auth/refresh', {
      refresh_token: first.refreshToken,
    });
    expect(authTokensSchema.safeParse(refreshed.data).success).toBe(true);

    await expect(
      getApiClient().post('/auth/refresh', { refresh_token: first.refreshToken }),
    ).rejects.toMatchObject({ response: { status: 400 } });
  });

  it('errors come back as RFC 7807 ProblemDetails, like ASP.NET Core sends', async () => {
    // toApiError reads `detail`/`title`; a mock returning `{ message }` would let
    // that mapping break silently against the real API. Status 400 and both
    // strings were verified against the live server.
    const error = await getApiClient()
      .post('/auth/login', { email: DEMO_EMAIL, password: 'wrong' })
      .catch((e: unknown) => e);

    expect(error).toMatchObject({
      response: {
        status: 400,
        data: { title: expect.any(String), detail: 'Invalid email or password' },
      },
    });
  });

  it('an invalid bearer token is a bare 401, with no body at all', async () => {
    // The live server sends no ProblemDetails here. Asserted because the 401 —
    // not the body — is what the refresh interceptor keys on.
    const error = await getApiClient()
      .get('/users/me', { headers: { Authorization: 'Bearer nonsense' } })
      .catch((e: unknown) => e);

    expect(error).toMatchObject({ response: { status: 401 } });
  });

  it('POST /auth/forgot-password returns the same body for known and unknown emails', async () => {
    const known = await getApiClient().post('/auth/forgot-password', { email: DEMO_EMAIL });
    const unknown = await getApiClient().post('/auth/forgot-password', {
      email: 'nobody@example.com',
    });

    expect(passwordResetRequestedSchema.safeParse(known.data).success).toBe(true);
    expect(passwordResetRequestedSchema.safeParse(unknown.data).success).toBe(true);
    // Identical status AND body: any difference is an account-enumeration oracle.
    expect(known.status).toBe(unknown.status);
    expect(known.data).toEqual(unknown.data);
  });

  it('the demo reset-code hint matches the code the mock actually issues', () => {
    // The hint is a shipped string in en.json and the code lives in @repo/mocks;
    // nothing but this assertion stops the two drifting into a demo that cannot be
    // completed. Same class of bug as a fixture that stops matching its schema.
    expect(resources.en.translation.auth.resetDemoHint).toContain(DEMO_RESET_CODE);
  });

  it('GET /api/posts returns a body matching the pagination envelope', async () => {
    await authenticateTestUser();

    const response = await getApiClient().get('/api/posts', { params: { page: 1, pageSize: 5 } });
    const result = postPageSchema.safeParse(response.data);

    expect(result.success, result.success ? '' : JSON.stringify(result.error.issues)).toBe(true);
  });

  it('rejects unauthenticated list requests, like a real backend would', async () => {
    // A mock that skips auth lets an unauthenticated bug reach production.
    await expect(getApiClient().get('/api/posts')).rejects.toMatchObject({
      response: { status: 401 },
    });
  });
});
