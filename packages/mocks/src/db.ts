import { type MockPost, initialPosts } from './fixtures/posts';
import { type MockUser, users as initialUsers } from './fixtures/users';

/**
 * In-memory store for the fake backend.
 *
 * Plain arrays, not @mswjs/data — one fewer dependency, and an agent can read
 * the whole thing in ten seconds. `reset()` restores the seed, which is what
 * keeps tests isolated.
 */
interface Db {
  users: MockUser[];
  posts: MockPost[];
  /** access token -> userId. Not a JWT: this is a mock, and a fake JWT invites misuse. */
  sessions: Map<string, string>;
  /**
   * refresh token -> userId, kept separate so a refresh token cannot be used as
   * a bearer credential. Consuming one DELETES it — see issueTokenPair.
   */
  refreshTokens: Map<string, string>;
  /**
   * Tokens this mock server has deliberately invalidated: refresh tokens that
   * have been spent, and users whose tokens were revoked wholesale.
   *
   * These exist because the maps above are NOT the only source of truth any more.
   * A mock token carries its user id (`mock-access-<userId>-<serial>`), so a
   * token can be resolved without having been issued by this instance — which is
   * what makes a session survive a page reload, since MSW runs in the page and
   * its maps die with it. Without that, the mock backend would contradict the
   * persisted session and `pnpm dev:web` would sign the user out on every reload
   * while a real backend would not.
   *
   * Denial has to stay explicit for that to be safe: "not in the map" now means
   * "possibly from a previous page", so revocation and rotation are recorded here
   * rather than inferred from absence.
   */
  spentRefreshTokens: Set<string>;
  /**
   * userId -> the highest token serial that has been revoked.
   *
   * A watermark, not a set of user ids: revocation must kill the tokens issued
   * BEFORE it and leave the ones issued after it alone, or a password change
   * would lock the account out of the very session it just created.
   */
  revokedBefore: Map<string, number>;
  nextPostId: number;
  /** Monotonic, so two pairs issued in the same millisecond still differ. */
  tokenCounter: number;
}

function seed(): Db {
  return {
    users: initialUsers.map((user) => ({ ...user })),
    posts: initialPosts.map((post) => ({ ...post })),
    sessions: new Map(),
    refreshTokens: new Map(),
    spentRefreshTokens: new Set(),
    revokedBefore: new Map(),
    nextPostId: 1000,
    tokenCounter: 0,
  };
}

export const db: Db = seed();

/**
 * Reset hooks for feature modules that keep their own records.
 *
 * Generated features (`pnpm gen feature`) store fixtures module-locally rather
 * than in `db` above, so they must register their reset here. Without it their
 * state leaks between tests: one test deletes a record and a later test cannot
 * find it, which surfaces as a baffling "Not found" in an unrelated test.
 */
const featureResets = new Set<() => void>();

export function registerReset(reset: () => void): void {
  featureResets.add(reset);
}

export function resetDb(): void {
  const fresh = seed();
  db.users = fresh.users;
  db.posts = fresh.posts;
  db.sessions = fresh.sessions;
  db.refreshTokens = fresh.refreshTokens;
  // Every field of Db has to be listed here. Forgetting one is silent and
  // vicious: tokenCounter resets, so the next test reissues the SAME token
  // string, and a stale spent-token entry then rejects a brand-new token.
  db.spentRefreshTokens = fresh.spentRefreshTokens;
  db.revokedBefore = fresh.revokedBefore;
  db.nextPostId = fresh.nextPostId;
  db.tokenCounter = fresh.tokenCounter;

  for (const reset of featureResets) reset();
}

/** 15 minutes, short enough that the refresh path is the normal case, not an edge. */
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** The `AuthTokenResponse` shape, snake_case exactly as the real API returns it. */
export interface MockTokenPair {
  access_token: string;
  access_token_expires_at: string;
  refresh_token: string;
  refresh_token_expires_at: string;
}

/**
 * Issue an access + refresh pair.
 *
 * Both live in `db` so `userFromAuthHeader` keeps working and so a refresh can be
 * validated. Old pairs are NOT invalidated here — `/auth/refresh` rotates by
 * deleting the token it consumed, which is what lets a test prove the client's
 * single-flight refresh actually prevents a self-inflicted sign-out.
 */
export function issueTokenPair(userId: string): MockTokenPair {
  db.tokenCounter += 1;
  const serial = String(db.tokenCounter);

  const accessToken = `mock-access-${userId}-${serial}`;
  const refreshToken = `mock-refresh-${userId}-${serial}`;

  db.sessions.set(accessToken, userId);
  db.refreshTokens.set(refreshToken, userId);

  return {
    access_token: accessToken,
    access_token_expires_at: new Date(Date.now() + ACCESS_TOKEN_TTL_MS).toISOString(),
    refresh_token: refreshToken,
    refresh_token_expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString(),
  };
}

/**
 * Spend a refresh token and issue a new pair, or return null if it is unknown.
 *
 * Rotation is the point: the presented token is deleted, so replaying it fails.
 */
/**
 * Reads the user id back out of a mock token.
 *
 * `issueTokenPair` builds them as `mock-<kind>-<userId>-<serial>`, and user ids
 * contain hyphens too ('user-1'), so the serial is matched as the trailing digits
 * rather than by splitting on '-'.
 *
 * This is what a real deployment gets for free from a signed JWT: any instance
 * can identify the bearer without having issued it. Here it is what lets a
 * persisted session outlive the page that created it.
 */
function parseMockToken(
  token: string,
  kind: 'access' | 'refresh',
): { userId: string; serial: number } | undefined {
  const match = new RegExp(`^mock-${kind}-(.+)-(\\d+)$`).exec(token);
  const userId = match?.[1];
  const serial = match?.[2];
  if (userId === undefined || serial === undefined) return undefined;

  return { userId, serial: Number(serial) };
}

/** True when this token was issued before the user's tokens were last revoked. */
function isRevoked(userId: string, serial: number): boolean {
  return serial <= (db.revokedBefore.get(userId) ?? 0);
}

/**
 * Spend a refresh token and issue a new pair, or return null if it is unknown.
 *
 * Rotation is the point: the presented token is recorded as spent, so replaying
 * it fails. Spending is recorded rather than just deleted because a token this
 * instance never issued may still be legitimate — see `spentRefreshTokens`.
 */
export function rotateRefreshToken(refreshToken: string): MockTokenPair | null {
  if (db.spentRefreshTokens.has(refreshToken)) return null;

  const parsed = parseMockToken(refreshToken, 'refresh');
  const userId = db.refreshTokens.get(refreshToken) ?? parsed?.userId;
  if (userId === undefined) return null;
  if (parsed !== undefined && isRevoked(userId, parsed.serial)) return null;
  if (!db.users.some((user) => user.id === userId)) return null;

  db.refreshTokens.delete(refreshToken);
  db.spentRefreshTokens.add(refreshToken);
  return issueTokenPair(userId);
}

/** Drops every access and refresh token for a user, as a password change does. */
export function revokeAllTokens(userId: string): void {
  for (const [token, owner] of db.sessions) if (owner === userId) db.sessions.delete(token);
  for (const [token, owner] of db.refreshTokens)
    if (owner === userId) db.refreshTokens.delete(token);

  // Recorded, not merely deleted: otherwise a revoked token would resolve again
  // through the token-parsing fallback below. The watermark is the counter as it
  // stands now, so everything issued so far is dead and the next pair is not.
  db.revokedBefore.set(userId, db.tokenCounter);
}

/** Resolves the Authorization header to a user, or null. */
export function userFromAuthHeader(header: string | null): MockUser | null {
  if (!header?.startsWith('Bearer ')) return null;

  const token = header.slice('Bearer '.length);
  const parsed = parseMockToken(token, 'access');
  const userId = db.sessions.get(token) ?? parsed?.userId;
  if (userId === undefined) return null;
  if (parsed !== undefined && isRevoked(userId, parsed.serial)) return null;

  return db.users.find((user) => user.id === userId) ?? null;
}

export function nextPostId(): string {
  db.nextPostId += 1;
  return `post-${String(db.nextPostId)}`;
}
