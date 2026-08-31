import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_DEBOUNCE_MS, useDebouncedValue } from '../use-debounced-value';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useDebouncedValue', () => {
  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('first'));

    expect(result.current).toBe('first');
  });

  it('does not update before the delay elapses', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'ab' });
    act(() => {
      vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS - 1);
    });

    expect(result.current).toBe('a');
  });

  it('updates once the delay elapses', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'ab' });
    act(() => {
      vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    });

    expect(result.current).toBe('ab');
  });

  it('collapses a burst of changes into ONE update', () => {
    // This is the property that matters: typing "post" must produce one request,
    // not four. Each rerender inside the window cancels the pending timer.
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: '' },
    });

    for (const value of ['p', 'po', 'pos', 'post']) {
      rerender({ value });
      act(() => {
        vi.advanceTimersByTime(50);
      });
      // Still the initial value: nothing has settled yet.
      expect(result.current).toBe('');
    }

    act(() => {
      vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    });
    expect(result.current).toBe('post');
  });

  it('honours a custom delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 1000), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'b' });
    act(() => {
      vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe('b');
  });

  it('works for non-string values', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: { page: 1 } },
    });

    rerender({ value: { page: 2 } });
    act(() => {
      vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    });

    expect(result.current).toEqual({ page: 2 });
  });
});
