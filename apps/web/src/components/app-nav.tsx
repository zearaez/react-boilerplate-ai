import { Link, useLocation } from 'react-router';

import { useSession, useTranslation } from '@repo/core';

import { visibleNavSections } from '@/components/nav-items';
import { cn } from '@/lib/utils';

/**
 * The sidebar's contents: grouped primary navigation.
 *
 * Metrics come from the console design rather than Tailwind's default scale,
 * which is why several are arbitrary values — 9/11px
 * item padding, a 17px icon, 13px labels, and a 10px uppercase mono section
 * heading with 0.1em tracking. Rounding these to the nearest Tailwind step
 * visibly loosens a dense sidebar.
 *
 * No brand mark here: in this design the brand lives in the full-width header
 * above, so the sidebar starts at its first section.
 *
 * Rendered twice — permanent sidebar at `md`+, drawer below it — which is why it
 * is a component and not inline markup. `onNavigate` is how the drawer closes
 * itself on a link click.
 */
export function AppNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const { user } = useSession();
  const { pathname } = useLocation();

  const sections = visibleNavSections(user?.role);

  return (
    <nav
      aria-label={t('nav.primary')}
      className="flex h-full flex-col gap-1 overflow-y-auto px-[10px] py-[14px]"
    >
      {sections.map((section) => (
        <div key={section.labelKey}>
          <h2 className="px-[10px] pb-[6px] pt-[14px] font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            {t(section.labelKey)}
          </h2>

          <ul className="flex flex-col gap-1">
            {section.items.map((item) => {
              const active = item.isActive(pathname);

              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    // Set here rather than via NavLink because the active rule is
                    // a predicate (see nav-items.ts). This is what a screen
                    // reader announces as "current page".
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-[11px] rounded-md px-[11px] py-[9px] text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active
                        ? // The design marks the current item with the BRAND
                          // tint, not a neutral grey — which is why
                          // `primary-tint` exists as its own token.
                          'bg-primary-tint font-bold text-primary-tint-foreground'
                        : 'font-medium text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <item.icon
                      aria-hidden="true"
                      // 17px with a 1.8 stroke is the design system's icon spec at this
                      // density; lucide's default 2 reads heavy next to 13px text.
                      size={17}
                      strokeWidth={1.8}
                      className="flex-none"
                    />
                    {t(item.labelKey)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
