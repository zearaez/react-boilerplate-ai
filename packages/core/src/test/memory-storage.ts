/**
 * Kept as a re-export so test files read naturally. The implementation lives in
 * src/storage/memory.ts because apps/web uses it in production too.
 */
export { createMemoryStorage } from '../storage/memory';
export type { MemoryStorage } from '../storage/memory';
