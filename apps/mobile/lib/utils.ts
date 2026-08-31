import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names, resolving Tailwind conflicts so a later class wins.
 *
 * DUPLICATED in apps/mobile/lib/utils.ts on purpose. The react-native-reusables
 * CLI writes and expects `~/lib/utils` and cannot be aliased to a shared package
 * the way shadcn's can, and the two platforms will eventually need different
 * extendTailwindMerge class groups (web has hover:, native does not). A drift
 * test asserts the two files stay identical until that divergence is real.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
