import { describe, expect, it } from 'vitest';

import { ApiError } from '../../api/errors';
import { DEFAULT_GC_TIME_MS, DEFAULT_STALE_TIME_MS, createQueryClient } from '../client';

type RetryFn = (failureCount: number, error: Error) => boolean;
type RetryDelayFn = (attempt: number, error: Error) => number;

function defaults() {
  const options = createQueryClient().getDefaultOptions();
  return {
    retry: options.queries?.retry as RetryFn,
    retryDelay: options.queries?.retryDelay as RetryDelayFn,
    queries: options.queries,
    mutations: options.mutations,
  };
}

describe('createQueryClient', () => {
  it('sets staleTime and gcTime explicitly rather than leaving defaults', () => {
    const { queries } = defaults();

    expect(queries?.staleTime).toBe(DEFAULT_STALE_TIME_MS);
    expect(queries?.gcTime).toBe(DEFAULT_GC_TIME_MS);
  });

  it('does not refetch on window focus', () => {
    // Mobile app-switching would otherwise fire a burst of requests on a metered
    // connection. apps/mobile/lib/query-platform.ts wires the signal deliberately.
    expect(defaults().queries?.refetchOnWindowFocus).toBe(false);
  });

  it('never retries a mutation by default', () => {
    // A retried mutation can double-create.
    expect(defaults().mutations?.retry).toBe(false);
  });
});

describe('the retry predicate', () => {
  it('retries network and 5xx failures', () => {
    const { retry } = defaults();

    expect(retry(0, new ApiError('network', 'offline'))).toBe(true);
    expect(retry(0, new ApiError('server', 'boom'))).toBe(true);
    expect(retry(1, new ApiError('server', 'boom'))).toBe(true);
  });

  it('gives up after two attempts', () => {
    const { retry } = defaults();

    expect(retry(2, new ApiError('server', 'boom'))).toBe(false);
    expect(retry(9, new ApiError('network', 'offline'))).toBe(false);
  });

  it('never retries a 4xx — the request is wrong, not unlucky', () => {
    const { retry } = defaults();

    // Retrying a 401 in particular races the sign-out in the response interceptor.
    expect(retry(0, new ApiError('unauthorized', 'nope'))).toBe(false);
    expect(retry(0, new ApiError('notFound', 'gone'))).toBe(false);
    expect(retry(0, new ApiError('validation', 'bad'))).toBe(false);
    expect(retry(0, new ApiError('schema', 'contract changed'))).toBe(false);
  });

  it('still retries a plain Error, since it carries no verdict', () => {
    expect(defaults().retry(0, new Error('unknown'))).toBe(true);
  });
});

describe('the retry delay', () => {
  it('backs off exponentially and caps at 8s', () => {
    const { retryDelay } = defaults();
    const error = new ApiError('server', 'boom');

    expect(retryDelay(0, error)).toBe(1000);
    expect(retryDelay(1, error)).toBe(2000);
    expect(retryDelay(2, error)).toBe(4000);
    expect(retryDelay(5, error)).toBe(8000);
    expect(retryDelay(50, error)).toBe(8000);
  });
});
