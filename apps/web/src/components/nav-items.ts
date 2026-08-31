import { FileText, UserRound } from 'lucide-react';

import type { User } from '@repo/core';
import type { LucideIcon } from 'lucide-react';

/**
 * The primary navigation, defined once.
 *
 * It lives here rather than inside the sidebar because it is rendered TWICE —
 * the permanent sidebar at `md` and up, and the drawer below it. Two copies of
 * this list is how a link ends up in one and not the other.
 */
/**
 * A labelled group of items, as the sidebar renders them: a small uppercase mono
 * heading with its items beneath.
 *
 * Grouping exists from the start because a console grows sections faster than it
 * grows screens — the shape is already here to receive the next one.
 */
export interface NavSection {
  /** i18n key for the section heading. */
  labelKey: string;
  items: readonly NavItem[];
}

export interface NavItem {
  to: string;
  /**
   * Reused from the feature that owns the screen rather than a `nav.*` key of its
   * own: two keys for one label is two places to rename it, and they drift.
   */
  labelKey: string;
  icon: LucideIcon;
  /**
   * Which paths light this item up.
   *
   * A predicate rather than `NavLink`'s own matching, because the posts screen is
   * the INDEX route: `to="/"` without `end` matches every path in the app, and
   * with `end` it stops matching on `/posts/new` — so neither setting keeps Posts
   * highlighted while you are editing a post. This says what is actually meant.
   */
  isActive: (pathname: string) => boolean;
  /**
   * Which roles see the item. Omitted means everyone.
   *
   * Hiding a link is about not offering a dead end, never about security — the
   * API is what enforces access, and a hidden link is still a reachable URL.
   */
  roles?: readonly User['role'][];
}

export const NAV_SECTIONS: readonly NavSection[] = [
  {
    labelKey: 'nav.sections.workspace',
    items: [
      {
        to: '/',
        labelKey: 'posts.listTitle',
        icon: FileText,
        isActive: (pathname) => pathname === '/' || pathname.startsWith('/posts'),
      },
      {
        to: '/profile',
        labelKey: 'profile.title',
        icon: UserRound,
        isActive: (pathname) => pathname.startsWith('/profile'),
      },
    ],
  },
];

/**
 * The sections this user can actually reach, with unreachable items removed and
 * any section left empty by that filtering dropped — otherwise a member sees an
 * "Admin" heading with nothing under it.
 */
export function visibleNavSections(role: User['role'] | undefined): readonly NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => item.roles === undefined || (role && item.roles.includes(role)),
    ),
  })).filter((section) => section.items.length > 0);
}
