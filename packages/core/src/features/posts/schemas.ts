import { z } from 'zod';

import { DEFAULT_PAGE_SIZE, paginated } from '../../api/pagination';

export const postSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  published: z.boolean(),
  createdAt: z.iso.datetime(),
});

export type Post = z.infer<typeof postSchema>;

export const postPageSchema = paginated(postSchema);
export type PostPage = z.infer<typeof postPageSchema>;

export const postListParamsSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(DEFAULT_PAGE_SIZE),
  search: z.string().trim().optional(),
});

/** Input type (all optional, defaults applied on parse). */
export type PostListParamsInput = z.input<typeof postListParamsSchema>;
/** Output type (defaults resolved). Query keys use this so they are stable. */
export type PostListParams = z.infer<typeof postListParamsSchema>;

/**
 * One schema, two jobs: it validates the create form (via zodResolver in both
 * apps) AND types the request body. That is the whole reason forms can be
 * written twice without the validation rules drifting.
 */
export const createPostInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, { message: 'Title must be at least 3 characters.' })
    .max(120, { message: 'Title must be 120 characters or fewer.' }),
  body: z
    .string()
    .trim()
    .min(10, { message: 'Body must be at least 10 characters.' })
    .max(5000, { message: 'Body must be 5000 characters or fewer.' }),
  published: z.boolean().default(false),
});

export type CreatePostInput = z.input<typeof createPostInputSchema>;

export const updatePostInputSchema = createPostInputSchema.partial();
export type UpdatePostInput = z.infer<typeof updatePostInputSchema>;
