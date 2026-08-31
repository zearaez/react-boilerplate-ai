import { z } from 'zod';

/**
 * The pagination envelope the API returns, and the camelCase shape the app
 * works in. `paginated()` is the boundary between the two.
 *
 * The wire shape is `PagedListOf<T>`: `{ items, page, page_size, total_count }`.
 * Two things about it drive the code below:
 *
 *  1. **snake_case.** Translating once, here, is what keeps `page_size` out of
 *     every screen. Anything past this parse is camelCase.
 *  2. **Integers arrive as `integer | string`.** The .NET OpenAPI document types
 *     every int that way (`"type": ["integer","string"]` with a numeric
 *     `pattern`), so a plain `z.number()` would reject `"page": "1"` at runtime
 *     and blame the schema. `z.coerce.number()` accepts both and still rejects
 *     genuine rubbish.
 *
 * There is no `hasMore` on the wire — it is derived, once, rather than at every
 * call site where it could be derived differently.
 *
 * Usage:
 *   const ticketPageSchema = paginated(ticketSummarySchema);
 */
export function paginated<TItem extends z.ZodType>(item: TItem) {
  return z
    .object({
      items: z.array(item),
      page: z.coerce.number().int().positive(),
      page_size: z.coerce.number().int().positive(),
      total_count: z.coerce.number().int().nonnegative(),
    })
    .transform((raw) => ({
      items: raw.items,
      page: raw.page,
      pageSize: raw.page_size,
      total: raw.total_count,
      // 1-indexed: page 2 of size 10 has seen 20 rows, so there is more only
      // when the count exceeds that.
      hasMore: raw.page * raw.page_size < raw.total_count,
    }));
}

export const DEFAULT_PAGE_SIZE = 10;

export const paginationParamsSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(DEFAULT_PAGE_SIZE),
});

export type PaginationParams = z.infer<typeof paginationParamsSchema>;

/**
 * Serialises pagination params for the query string.
 *
 * The capitals are not a typo and not ours to fix: the API binds a .NET
 * record, so the parameters really are `Page` and `PageSize` while every other
 * query parameter on the same endpoints is lower-case (`status`, `owner_id`).
 * Getting this wrong is silent — the server falls back to page 1 and the list
 * simply never advances.
 */
export function pagedQuery(params: PaginationParams): { Page: number; PageSize: number } {
  return { Page: params.page, PageSize: params.pageSize };
}

export interface Page<TItem> {
  items: TItem[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

/**
 * getNextPageParam for every useInfiniteQuery in the repo. Returns undefined
 * when there is nothing more, which is what tells TanStack Query to stop.
 */
export function nextPageParam(lastPage: Page<unknown>): number | undefined {
  return lastPage.hasMore ? lastPage.page + 1 : undefined;
}

/** Flattens infinite-query pages into a single list for rendering. */
export function flattenPages<TItem>(pages: ReadonlyArray<Page<TItem>> | undefined): TItem[] {
  if (!pages) return [];
  return pages.flatMap((page) => page.items);
}
