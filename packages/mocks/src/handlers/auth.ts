import { HttpResponse, http } from 'msw';

import {
  db,
  issueTokenPair,
  registerReset,
  revokeAllTokens,
  rotateRefreshToken,
  userFromAuthHeader,
} from '../db';
import { publicUser, resetCodeForUser } from '../fixtures/users';

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

interface RefreshBody {
  refresh_token?: unknown;
}

/**
 * An RFC 7807 ProblemDetails body, because that is what ASP.NET Core returns and
 * what `toApiError` in @repo/core parses. Returning `{ message }` here instead
 * would let a client-side bug in the error mapping pass every test.
 */
function problem(status: number, title: string, detail: string) {
  return HttpResponse.json({ type: 'about:blank', title, status, detail }, { status });
}

interface ForgotPasswordBody {
  email?: unknown;
}

interface ResetPasswordBody {
  token?: unknown;
  password?: unknown;
}

const RESET_CODE_TTL_MS = 30 * 60 * 1000;

/**
 * Issued reset codes: code -> { userId, expiresAt }.
 *
 * Module-local rather than in `db`, like the profile handler's record, so it
 * registers its own reset — without that a code issued by one test is still
 * live in the next one.
 */
interface ResetRecord {
  userId: string;
  expiresAt: number;
}

let resetCodes = new Map<string, ResetRecord>();

export function clearResetCodes(): void {
  resetCodes = new Map();
}

registerReset(clearResetCodes);

/**
 * EVERY handler path starts with `*`.
 *
 * The browser worker matches against absolute URLs (http://localhost:4000/api/…)
 * while @mswjs/http-middleware matches bare paths (/api/…). A leading `*` is the
 * only form that satisfies both. Drop it and you get mocks that work on web and
 * 404 on device — which looks like a networking problem and is not one.
 */
export const authHandlers = [
  http.post('*/auth/login', async ({ request }) => {
    const body = (await request.json()) as LoginBody;
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    const user = db.users.find((candidate) => candidate.email.toLowerCase() === email);

    // 400, NOT 401 — verified against the live server, which answers a bad
    // password with `400 Bad Request` and `detail: "Invalid email or password"`.
    // The distinction is load-bearing: the 401 interceptor in @repo/core treats a
    // 401 as "token died, try refreshing", and a mock that 401'd here would
    // exercise that path on every failed login. Status and wording both copied
    // verbatim from the real response.
    if (!user || user.password !== password) {
      return problem(400, 'Bad Request', 'Invalid email or password');
    }

    // Tokens ONLY — no user object. The real endpoint works this way, which is
    // why login() in @repo/core makes a second call to /users/me. A mock that
    // helpfully bundled the user here would hide that round trip until
    // production.
    return HttpResponse.json(issueTokenPair(user.id));
  }),

  http.post('*/auth/refresh', async ({ request }) => {
    // A BODYLESS refresh is a real case, not a malformed one: under the cookie
    // contract the credential is an httpOnly cookie and there is nothing to put
    // in a body. `request.json()` throws on an empty body, so it is guarded —
    // otherwise the cold-start session probe turns every mocked boot into a 500.
    let body: RefreshBody = {};
    try {
      body = (await request.json()) as RefreshBody;
    } catch {
      // An empty body makes request.json() throw. Leaving `body` empty is the
      // right answer: this mock has no cookie jar, so a bodyless refresh means
      // "no credential presented".
    }

    const presented = typeof body.refresh_token === 'string' ? body.refresh_token : '';

    if (presented === '') {
      // What the live server answers for an absent token, verified: a validation
      // ProblemDetails, not the generic one below. This mock has no cookie jar,
      // so a bodyless refresh is always "no credential" here.
      return HttpResponse.json(
        {
          type: 'about:blank',
          title: 'One or more validation errors occurred.',
          status: 400,
          errors: { RefreshToken: ["'Refresh Token' must not be empty."] },
        },
        { status: 400 },
      );
    }

    // Also 400 on the real server, with this exact detail string.
    const rotated = rotateRefreshToken(presented);
    if (!rotated) {
      return problem(400, 'Bad Request', 'Invalid or expired refresh token');
    }

    return HttpResponse.json(rotated);
  }),

  /**
   * `POST /auth/logout` — 204, and it revokes.
   *
   * Does NOT exist on the live deployment yet (it 404s), and it is mocked anyway
   * because the cookie contract cannot work without it: an httpOnly cookie is
   * only clearable by the server that set it. Revoking here rather than just
   * answering 204 is what makes "signed out really means signed out" testable.
   */
  http.post('*/auth/logout', ({ request }) => {
    const user = userFromAuthHeader(request.headers.get('Authorization'));
    if (user) revokeAllTokens(user.id);

    return new HttpResponse(null, { status: 204 });
  }),

  http.post('*/auth/forgot-password', async ({ request }) => {
    const body = (await request.json()) as ForgotPasswordBody;
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';

    const user = db.users.find((candidate) => candidate.email.toLowerCase() === email);

    // ONE response shape, always. A 404 for an address with no account would make
    // this endpoint an account-enumeration oracle: anyone could test a list of
    // emails against it and learn who has an account here. A code is only issued
    // when there is somebody to send it to, but the caller cannot tell.
    if (user) {
      resetCodes.set(resetCodeForUser(user.id), {
        userId: user.id,
        expiresAt: Date.now() + RESET_CODE_TTL_MS,
      });
    }

    return HttpResponse.json({ status: 'sent' }, { status: 202 });
  }),

  http.post('*/auth/reset-password', async ({ request }) => {
    const body = (await request.json()) as ResetPasswordBody;
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    const record = resetCodes.get(token);
    if (!record || record.expiresAt <= Date.now()) {
      // Expired codes are dropped on the way past, so a stale one cannot be
      // retried until it happens to line up with a fresh request.
      resetCodes.delete(token);
      return HttpResponse.json(
        {
          message: 'That reset code is not valid any more.',
          errors: { token: ['That reset code is not valid any more. Request a new one.'] },
        },
        { status: 422 },
      );
    }

    // The same minimum the shared schema enforces. A mock that is laxer than the
    // server lets a client-side-only guard look like a real one.
    if (password.length < 8) {
      return HttpResponse.json(
        {
          message: 'Validation failed.',
          errors: { password: ['Password must be at least 8 characters.'] },
        },
        { status: 422 },
      );
    }

    const user = db.users.find((candidate) => candidate.id === record.userId);
    if (!user) {
      resetCodes.delete(token);
      return HttpResponse.json({ message: 'That account no longer exists.' }, { status: 422 });
    }

    user.password = password;
    // Single use: the code dies with the request that spends it.
    resetCodes.delete(token);

    // A password reset must end every session, including whichever one an
    // attacker is holding — that is most of the point of resetting it. Refresh
    // tokens go too, or the attacker just mints a new access token.
    revokeAllTokens(user.id);

    return new HttpResponse(null, { status: 204 });
  }),

  http.get('*/users/me', ({ request }) => {
    const user = userFromAuthHeader(request.headers.get('Authorization'));
    if (!user) {
      // 401 with an EMPTY body, which is what the live server sends for a bad or
      // missing bearer token — no ProblemDetails at all. toApiError therefore
      // falls back to "Request failed (401)."; the message is never shown because
      // the interceptor turns this into a refresh or a sign-out.
      return new HttpResponse(null, { status: 401 });
    }
    return HttpResponse.json(publicUser(user));
  }),

  /**
   * `PATCH /users/me` — update the caller's own profile.
   *
   * Note there is no email field: the API cannot change an email, so neither can
   * this. Sending one is ignored rather than honoured, which is what the real
   * server's command binding does with an unknown property.
   */
  http.patch('*/users/me', async ({ request }) => {
    const user = userFromAuthHeader(request.headers.get('Authorization'));
    if (!user) return new HttpResponse(null, { status: 401 });

    const body = (await request.json()) as {
      name?: unknown;
      phone?: unknown;
    };

    if (typeof body.name === 'string') {
      if (body.name.trim() === '') {
        return HttpResponse.json(
          {
            type: 'about:blank',
            title: 'One or more validation errors occurred.',
            status: 400,
            errors: { Name: ['Name must not be empty.'] },
          },
          { status: 400 },
        );
      }
      user.name = body.name.trim();
    }
    // Null is a legitimate value here — clearing a phone number is allowed.
    if (typeof body.phone === 'string' || body.phone === null) {
      user.phone = body.phone;
    }
    return HttpResponse.json(publicUser(user));
  }),

  /**
   * `POST /users/me/password` — 204, and it REVOKES EVERY TOKEN.
   *
   * The revocation is the point of mocking this at all: it is the only
   * server-side revocation the API has, and a client that keeps using its
   * session afterwards is relying on an access token the server has already
   * disowned. Revoking here is what makes that testable.
   */
  http.post('*/users/me/password', async ({ request }) => {
    const user = userFromAuthHeader(request.headers.get('Authorization'));
    if (!user) return new HttpResponse(null, { status: 401 });

    const body = (await request.json()) as {
      current_password?: unknown;
      new_password?: unknown;
    };

    if (body.current_password !== user.password) {
      return HttpResponse.json(
        {
          type: 'about:blank',
          title: 'One or more validation errors occurred.',
          status: 400,
          errors: { CurrentPassword: ['That is not your current password.'] },
        },
        { status: 400 },
      );
    }

    if (typeof body.new_password !== 'string' || body.new_password.length < 8) {
      return HttpResponse.json(
        {
          type: 'about:blank',
          title: 'One or more validation errors occurred.',
          status: 400,
          errors: { NewPassword: ['Password must be at least 8 characters.'] },
        },
        { status: 400 },
      );
    }

    user.password = body.new_password;
    revokeAllTokens(user.id);

    return new HttpResponse(null, { status: 204 });
  }),
];
