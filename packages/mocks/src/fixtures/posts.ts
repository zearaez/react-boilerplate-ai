import { users } from './users';

export interface MockPost {
  id: string;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  published: boolean;
  createdAt: string;
}

/**
 * The id whose PATCH always returns 500.
 *
 * This exists so the optimistic-update rollback in useUpdatePost is actually
 * demonstrable: edit this post, watch the UI update instantly, then watch it
 * snap back. A rollback path nobody can trigger is a rollback path nobody knows
 * is broken.
 */
export const ALWAYS_FAILS_POST_ID = 'post-fail';

const TITLES = [
  'Notes on shipping small',
  'Why the boring stack wins',
  'Reading the docs, again',
  'A short case for typed errors',
  'Cache invalidation, revisited',
  'On deleting code',
  'The cost of one more abstraction',
  'Mock servers earn their keep',
  'Naming things is still hard',
  'Optimistic, within reason',
  'Pagination is a contract',
  'Tokens over hex codes',
];

/**
 * Deliberately NOT random. Fixtures are generated from an index so the fixture
 * set is byte-identical on every machine and every CI run — a flaky fixture is a
 * flaky test suite.
 *
 * 47 posts, so a pageSize of 10 gives 5 pages with a short final page. That
 * catches off-by-one bugs that an exact multiple would hide.
 */
export const TOTAL_SEEDED_POSTS = 47;

function seedPosts(): MockPost[] {
  const base = Date.UTC(2026, 0, 1, 9, 0, 0);

  // `noUncheckedIndexedAccess` makes every array read `T | undefined`, and
  // non-null assertions are banned. Resolving the invariant once, loudly, beats
  // sprinkling `!` or `??` at each use.
  const [primaryAuthor] = users;
  if (!primaryAuthor) throw new Error('Fixtures need at least one user in fixtures/users.ts');

  const seeded: MockPost[] = Array.from({ length: TOTAL_SEEDED_POSTS }, (_unused, index) => {
    const author = users[index % users.length] ?? primaryAuthor;
    const title = TITLES[index % TITLES.length] ?? 'Untitled';

    return {
      id: `post-${String(index + 1).padStart(3, '0')}`,
      title: `${title} #${String(index + 1)}`,
      body:
        `This is seeded fixture content for post ${String(index + 1)}. ` +
        `It is long enough to exercise text wrapping and the body length validator, ` +
        `and short enough to read in a list.`,
      authorId: author.id,
      authorName: author.name,
      published: index % 4 !== 0,
      // Descending by an hour each, so "newest first" ordering is observable.
      createdAt: new Date(base - index * 3_600_000).toISOString(),
    };
  });

  seeded.unshift({
    id: ALWAYS_FAILS_POST_ID,
    title: 'Editing this post always fails (on purpose)',
    body:
      'PATCH /api/posts/post-fail always returns 500. Edit it to watch the ' +
      'optimistic update in useUpdatePost apply instantly and then roll back.',
    authorId: primaryAuthor.id,
    authorName: primaryAuthor.name,
    published: true,
    createdAt: new Date(base + 3_600_000).toISOString(),
  });

  return seeded;
}

export const initialPosts: MockPost[] = seedPosts();
