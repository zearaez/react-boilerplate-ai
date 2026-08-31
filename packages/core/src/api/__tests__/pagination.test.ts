import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { flattenPages, nextPageParam, pagedQuery, paginated } from '../pagination';

const itemSchema = z.object({ id: z.string() });
const pageSchema = paginated(itemSchema);

function wire(overrides: Record<string, unknown> = {}) {
  return { items: [{ id: 'a' }], page: 1, page_size: 10, total_count: 25, ...overrides };
}

describe('paginated', () => {
  it('translates the snake_case wire shape into the camelCase app shape', () => {
    const page = pageSchema.parse(wire());

    expect(page).toEqual({
      items: [{ id: 'a' }],
      page: 1,
      pageSize: 10,
      total: 25,
      hasMore: true,
    });
  });

  it('accepts integers sent as strings', () => {
    // The .NET OpenAPI document types every int as `integer | string`, so this is
    // the documented contract, not defensive programming. A plain z.number() here
    // would reject a real response and blame the schema.
    const page = pageSchema.parse(wire({ page: '2', page_size: '10', total_count: '25' }));

    expect(page.page).toBe(2);
    expect(page.pageSize).toBe(10);
    expect(page.total).toBe(25);
  });

  it('derives hasMore, because the server does not send it', () => {
    // Page 3 of 10 has seen 30 of 25 rows — there is nothing left.
    expect(pageSchema.parse(wire({ page: 3 })).hasMore).toBe(false);
    // Exactly consumed: 25 of 25.
    expect(pageSchema.parse(wire({ page: 5, page_size: 5, total_count: 25 })).hasMore).toBe(false);
    // One row short of the end.
    expect(pageSchema.parse(wire({ page: 2, page_size: 10, total_count: 21 })).hasMore).toBe(true);
  });

  it('handles an empty last page without claiming there is more', () => {
    expect(pageSchema.parse(wire({ items: [], page: 1, total_count: 0 })).hasMore).toBe(false);
  });

  it('rejects a body that is missing the count', () => {
    const result = pageSchema.safeParse({ items: [], page: 1, page_size: 10 });
    expect(result.success).toBe(false);
  });
});

describe('pagedQuery', () => {
  it('capitalises Page and PageSize for the .NET model binder', () => {
    // Lower-case keys are silently ignored by the server, which falls back to
    // page 1 — the list then never advances and nothing errors.
    expect(pagedQuery({ page: 3, pageSize: 25 })).toEqual({ Page: 3, PageSize: 25 });
  });
});

describe('nextPageParam', () => {
  it('advances while there is more and stops at the end', () => {
    expect(nextPageParam({ items: [], page: 1, pageSize: 10, total: 25, hasMore: true })).toBe(2);
    expect(
      nextPageParam({ items: [], page: 3, pageSize: 10, total: 25, hasMore: false }),
    ).toBeUndefined();
  });
});

describe('flattenPages', () => {
  it('concatenates pages in order and tolerates undefined', () => {
    expect(flattenPages(undefined)).toEqual([]);
    expect(
      flattenPages([
        { items: ['a', 'b'], page: 1, pageSize: 2, total: 3, hasMore: true },
        { items: ['c'], page: 2, pageSize: 2, total: 3, hasMore: false },
      ]),
    ).toEqual(['a', 'b', 'c']);
  });
});
