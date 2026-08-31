import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ApiError, isApiError, parseRequestBody, toApiError, zodToFieldErrors } from '../errors';

function axiosErrorWith(status: number, data: unknown): AxiosError {
  const error = new AxiosError('Request failed');
  const headers = new AxiosHeaders();
  error.response = {
    status,
    statusText: '',
    data,
    headers,
    config: { headers },
  };
  return error;
}

describe('toApiError', () => {
  it('passes an ApiError through untouched', () => {
    const original = new ApiError('server', 'boom');
    expect(toApiError(original)).toBe(original);
  });

  it('maps a missing response to network', () => {
    const error = toApiError(new AxiosError('Network Error'));

    expect(error.kind).toBe('network');
    expect(error.isRetryable).toBe(true);
  });

  it.each([
    [401, 'unauthorized'],
    [403, 'unauthorized'],
    [404, 'notFound'],
    [400, 'validation'],
    [422, 'validation'],
    [409, 'client'],
    [500, 'server'],
    [503, 'server'],
  ] as const)('maps HTTP %i to %s', (status, kind) => {
    expect(toApiError(axiosErrorWith(status, {})).kind).toBe(kind);
  });

  it('only treats network and 5xx as retryable', () => {
    // Retrying a 401 would race the sign-out in the response interceptor.
    expect(toApiError(axiosErrorWith(401, {})).isRetryable).toBe(false);
    expect(toApiError(axiosErrorWith(404, {})).isRetryable).toBe(false);
    expect(toApiError(axiosErrorWith(500, {})).isRetryable).toBe(true);
  });

  it('prefers the server message over a generic one', () => {
    expect(toApiError(axiosErrorWith(400, { message: 'Title is taken' })).message).toBe(
      'Title is taken',
    );
    // Django/DRF style.
    expect(toApiError(axiosErrorWith(400, { detail: 'Bad request' })).message).toBe('Bad request');
  });

  it('normalises server field errors, whether string or array', () => {
    const error = toApiError(
      axiosErrorWith(422, { errors: { title: ['Too short'], body: 'Required' } }),
    );

    expect(error.fieldErrors).toEqual({ title: ['Too short'], body: ['Required'] });
  });

  it('maps a response-schema mismatch to schema, naming the failing path', () => {
    const schema = z.object({ nested: z.object({ id: z.string() }) });
    const zodError = schema.safeParse({ nested: { id: 42 } });
    if (zodError.success) throw new Error('fixture should not parse');

    const error = toApiError(zodError.error);

    expect(error.kind).toBe('schema');
    expect(error.message).toContain('nested.id');
  });

  it('falls back to unknown for anything else', () => {
    expect(toApiError(new Error('weird')).kind).toBe('unknown');
    expect(toApiError('a string').kind).toBe('unknown');
  });
});

describe('isApiError', () => {
  it('discriminates', () => {
    expect(isApiError(new ApiError('server', 'x'))).toBe(true);
    expect(isApiError(new Error('x'))).toBe(false);
    expect(isApiError(null)).toBe(false);
  });
});

describe('parseRequestBody', () => {
  const schema = z.object({
    title: z.string().min(3, { message: 'Too short.' }),
    published: z.boolean().default(false),
  });

  it('returns parsed output with defaults applied', () => {
    expect(parseRequestBody(schema, { title: 'hello' })).toEqual({
      title: 'hello',
      published: false,
    });
  });

  it('throws validation — not schema — so a form can show the messages', () => {
    const error = (() => {
      try {
        parseRequestBody(schema, { title: 'x' });
        return null;
      } catch (caught) {
        return caught;
      }
    })();

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).kind).toBe('validation');
    expect((error as ApiError).fieldErrors).toEqual({ title: ['Too short.'] });
  });
});

describe('zodToFieldErrors', () => {
  it('keys by dotted path and groups multiple issues per field', () => {
    const schema = z.object({ a: z.object({ b: z.string() }), c: z.number() });
    const result = schema.safeParse({ a: { b: 1 }, c: 'no' });
    if (result.success) throw new Error('fixture should not parse');

    const fieldErrors = zodToFieldErrors(result.error);

    expect(Object.keys(fieldErrors).sort()).toEqual(['a.b', 'c']);
  });
});
