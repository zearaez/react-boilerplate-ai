/**
 * Query-key factory. NEVER inline a key array at a call site — a typo in one
 * place silently splits the cache and produces "why didn't my list refresh"
 * bugs that are invisible in code review.
 */
export const authKeys = {
  all: ['auth'] as const,
  currentUser: () => [...authKeys.all, 'me'] as const,
};
