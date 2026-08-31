import { HttpResponse, http } from 'msw';

import { db, nextPostId, userFromAuthHeader } from '../db';
import { ALWAYS_FAILS_POST_ID, type MockPost } from '../fixtures/posts';

const DEFAULT_PAGE_SIZE = 10;

interface PostBody {
  title?: unknown;
  body?: unknown;
  published?: unknown;
}

function unauthorized() {
  return HttpResponse.json({ message: 'Not authenticated.' }, { status: 401 });
}

function readNumberParam(url: URL, key: string, fallback: number): number {
  const raw = url.searchParams.get(key);
  if (raw === null) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export const postHandlers = [
  http.get('*/api/posts', ({ request }) => {
    if (!userFromAuthHeader(request.headers.get('Authorization'))) return unauthorized();

    const url = new URL(request.url);
    // `Page`/`PageSize` capitalised, matching the .NET model binder the real API
    // uses. The lower-case fallbacks keep hand-written URLs working.
    const page = readNumberParam(url, 'Page', readNumberParam(url, 'page', 1));
    const pageSize = Math.min(
      readNumberParam(url, 'PageSize', readNumberParam(url, 'pageSize', DEFAULT_PAGE_SIZE)),
      100,
    );
    const search = url.searchParams.get('search')?.toLowerCase().trim() ?? '';

    const matching = search
      ? db.posts.filter(
          (post) =>
            post.title.toLowerCase().includes(search) || post.body.toLowerCase().includes(search),
        )
      : db.posts;

    const start = (page - 1) * pageSize;
    const items = matching.slice(start, start + pageSize);

    // `PagedListOf<T>`: snake_case, and NO hasMore — the client derives that in
    // paginated(). Emitting a convenient `hasMore` here would leave the real
    // derivation untested.
    return HttpResponse.json({
      items,
      page,
      page_size: pageSize,
      total_count: matching.length,
    });
  }),

  http.get('*/api/posts/:id', ({ request, params }) => {
    if (!userFromAuthHeader(request.headers.get('Authorization'))) return unauthorized();

    const post = db.posts.find((candidate) => candidate.id === params.id);
    if (!post) return HttpResponse.json({ message: 'Post not found.' }, { status: 404 });

    return HttpResponse.json(post);
  }),

  http.post('*/api/posts', async ({ request }) => {
    const user = userFromAuthHeader(request.headers.get('Authorization'));
    if (!user) return unauthorized();

    const body = (await request.json()) as PostBody;
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const text = typeof body.body === 'string' ? body.body.trim() : '';

    // A real backend validates too, so the mock does — otherwise client-side
    // validation is the only thing standing between a typo and a 200.
    const errors: Record<string, string[]> = {};
    if (title.length < 3) errors['title'] = ['Title must be at least 3 characters.'];
    if (text.length < 10) errors['body'] = ['Body must be at least 10 characters.'];
    if (Object.keys(errors).length > 0) {
      return HttpResponse.json({ message: 'Validation failed.', errors }, { status: 422 });
    }

    const created: MockPost = {
      id: nextPostId(),
      title,
      body: text,
      authorId: user.id,
      authorName: user.name,
      published: body.published === true,
      createdAt: new Date().toISOString(),
    };

    db.posts.unshift(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.patch('*/api/posts/:id', async ({ request, params }) => {
    if (!userFromAuthHeader(request.headers.get('Authorization'))) return unauthorized();

    // The seeded failure case. See ALWAYS_FAILS_POST_ID for why it exists.
    if (params.id === ALWAYS_FAILS_POST_ID) {
      return HttpResponse.json(
        { message: 'This post always fails to save (seeded 500).' },
        { status: 500 },
      );
    }

    const index = db.posts.findIndex((candidate) => candidate.id === params.id);
    const existing = db.posts[index];
    if (index === -1 || !existing) {
      return HttpResponse.json({ message: 'Post not found.' }, { status: 404 });
    }

    const body = (await request.json()) as PostBody;
    const updated: MockPost = {
      ...existing,
      ...(typeof body.title === 'string' ? { title: body.title.trim() } : {}),
      ...(typeof body.body === 'string' ? { body: body.body.trim() } : {}),
      ...(typeof body.published === 'boolean' ? { published: body.published } : {}),
    };

    db.posts[index] = updated;
    return HttpResponse.json(updated);
  }),

  http.delete('*/api/posts/:id', ({ request, params }) => {
    if (!userFromAuthHeader(request.headers.get('Authorization'))) return unauthorized();

    const index = db.posts.findIndex((candidate) => candidate.id === params.id);
    if (index === -1) return HttpResponse.json({ message: 'Post not found.' }, { status: 404 });

    db.posts.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];
