import { getApiClient } from '../../api/client';
import { parseRequestBody, toApiError } from '../../api/errors';
import { pagedQuery } from '../../api/pagination';

import {
  type CreatePostInput,
  type Post,
  type PostListParams,
  type PostPage,
  type UpdatePostInput,
  createPostInputSchema,
  postPageSchema,
  postSchema,
  updatePostInputSchema,
} from './schemas';

export async function listPosts(params: PostListParams): Promise<PostPage> {
  try {
    const response = await getApiClient().get('/api/posts', {
      params: {
        // pagedQuery, not `page`/`pageSize` by hand: the API binds a .NET
        // record, so the wire names are `Page`/`PageSize` while sibling filters
        // stay lower-case. Getting it wrong is silent — the server falls back to
        // page 1 and the list never advances.
        ...pagedQuery(params),
        ...(params.search ? { search: params.search } : {}),
      },
    });
    return postPageSchema.parse(response.data);
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getPost(id: string): Promise<Post> {
  try {
    const response = await getApiClient().get(`/api/posts/${id}`);
    return postSchema.parse(response.data);
  } catch (error) {
    throw toApiError(error);
  }
}

export async function createPost(input: CreatePostInput): Promise<Post> {
  try {
    // Validate the INPUT too, not just the response. This applies defaults
    // (published: false) and turns bad input into kind:'validation' with
    // fieldErrors a form can render — see parseRequestBody for why that is not
    // the same thing as a response-schema failure.
    const body = parseRequestBody(createPostInputSchema, input);
    const response = await getApiClient().post('/api/posts', body);
    return postSchema.parse(response.data);
  } catch (error) {
    throw toApiError(error);
  }
}

export async function updatePost(id: string, input: UpdatePostInput): Promise<Post> {
  try {
    const body = parseRequestBody(updatePostInputSchema, input);
    const response = await getApiClient().patch(`/api/posts/${id}`, body);
    return postSchema.parse(response.data);
  } catch (error) {
    throw toApiError(error);
  }
}

export async function deletePost(id: string): Promise<void> {
  try {
    await getApiClient().delete(`/api/posts/${id}`);
  } catch (error) {
    throw toApiError(error);
  }
}
