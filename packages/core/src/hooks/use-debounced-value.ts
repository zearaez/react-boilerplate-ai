import { useEffect, useState } from 'react';

/**
 * Delays a value until it has stopped changing for `delayMs`.
 *
 * Use this for anything that turns keystrokes into requests. The alternative an
 * agent usually reaches for — putting the raw input straight into a query key —
 * fires a request per character, and because each one has a different key it also
 * fills the cache with entries nobody will read again.
 *
 * The input itself must stay UNCONTROLLED by this hook: keep the raw value in
 * component state so typing is instant, and pass only the debounced value to the
 * query. Debouncing the input value is what makes a search field feel broken.
 *
 *   const [search, setSearch] = useState('');
 *   const debounced = useDebouncedValue(search, 300);
 *   const { posts } = usePostsQuery({ search: debounced });
 */
export const DEFAULT_DEBOUNCE_MS = 300;

export function useDebouncedValue<T>(value: T, delayMs: number = DEFAULT_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delayMs);

    // Clearing on every change is the whole mechanism: a keystroke inside the
    // window cancels the pending update rather than queueing a second one.
    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debounced;
}
