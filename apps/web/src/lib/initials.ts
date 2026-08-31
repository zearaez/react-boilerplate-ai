/**
 * "Anisha Shrestha" -> "AS". Falls back to one letter for a single-word name.
 *
 * Shared rather than local to one screen: the Console design uses an initials
 * avatar in the header, the users table, the leave list and the map markers, and
 * two implementations would eventually disagree about a middle name.
 */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';

  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}
