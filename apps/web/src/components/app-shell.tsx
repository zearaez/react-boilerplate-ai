import * as React from 'react';

import { LogOut, Menu } from 'lucide-react';
import { Link, Outlet, useLocation, useMatches } from 'react-router';

import { useLogout, useSession, useTranslation } from '@repo/core';

import { AppNav } from '@/components/app-nav';
import { BrandMark } from '@/components/brand-mark';
import { InitialsAvatar } from '@/components/initials-avatar';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

/**
 * Does any matched route ask for a full-bleed content area?
 *
 * Route `handle` is typed `unknown` by React Router, so it is narrowed here
 * rather than cast — a screen that sets the flag to a string should not silently
 * turn the padding off.
 *
 * It exists for screens that fill their frame — a map, a canvas, a split pane:
 * the content region has no padding of its own and each screen adds what it
 * needs, so a padded `main` would inset such a screen and leave a border of page
 * colour around it.
 */
function wantsFullBleed(handle: unknown): boolean {
  return (
    typeof handle === 'object' &&
    handle !== null &&
    'fullBleed' in handle &&
    handle.fullBleed === true
  );
}

/**
 * The console shell: a FULL-WIDTH 54px header, and below it a 212px sidebar
 * beside the content column.
 *
 * The brand and the role identify the whole app, so they belong in a bar that
 * spans it, and the sidebar is then purely navigation.
 *
 * The header deliberately does NOT carry the page title. Every screen already
 * renders its own `<h1>` with a subtitle and often a primary action, so a title
 * here would print the same words twice.
 *
 * There is deliberately no global search box: one that cannot search is worse
 * than none, and it needs a search endpoint first.
 */
export function AppShell() {
  const { t } = useTranslation();
  const { user } = useSession();
  const logout = useLogout();
  const { pathname } = useLocation();
  const fullBleed = useMatches().some((match) => wantsFullBleed(match.handle));

  /**
   * Which route the drawer was opened on, or null for closed.
   *
   * Storing the route makes "close on navigation" derived rather than an effect:
   * the drawer is open only while the route it was opened on is current. The
   * obvious `useEffect` that calls setState on a pathname change is a second
   * render pass for something already knowable in the first, and
   * `react-hooks/set-state-in-effect` rejects it.
   */
  const [openedOn, setOpenedOn] = React.useState<string | null>(null);
  const drawerOpen = openedOn === pathname;

  const setDrawerOpen = (next: boolean) => {
    setOpenedOn(next ? pathname : null);
  };

  return (
    <div
      className={cn(
        'flex flex-col bg-background',
        // A full-bleed screen needs a BOUNDED height, not a minimum: the map
        // inside it is `h-full`, and against `min-h-dvh` that resolves to zero.
        fullBleed ? 'h-dvh overflow-hidden' : 'min-h-dvh',
      )}
    >
      <header className="flex h-[54px] flex-none items-center gap-[14px] border-b bg-card px-[18px]">
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2 md:hidden"
              aria-label={t('nav.openMenu')}
            >
              <Menu aria-hidden="true" />
            </Button>
          </SheetTrigger>

          <SheetContent side="left" className="w-[212px] p-0">
            {/* Radix requires a dialog title and warns without one. The drawer
                shows the brand in the header behind it, so this is announced
                rather than drawn. */}
            <SheetHeader className="sr-only">
              <SheetTitle>{t('nav.menu')}</SheetTitle>
              <SheetDescription>{t('nav.primary')}</SheetDescription>
            </SheetHeader>

            <AppNav
              onNavigate={() => {
                setDrawerOpen(false);
              }}
            />
          </SheetContent>
        </Sheet>

        <Link
          to="/"
          className="flex items-center gap-[14px] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BrandMark className="size-6 flex-none" />
          <span className="text-[15px] font-extrabold tracking-[-0.01em]">
            {t('common.appName')}
          </span>
        </Link>

        {user ? (
          // The role, set in mono behind a divider rule — the design's way of
          // saying "this is which console you are looking at". Hidden on the
          // narrowest screens, where the brand alone has to do.
          <span className="hidden border-l pl-[14px] font-mono text-[11px] font-semibold text-muted-foreground sm:inline">
            {t(`common.roles.${user.role}`)}
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-1">
          {user ? (
            <Link
              to="/profile"
              className="flex items-center gap-[10px] rounded-full pl-1 pr-2 text-[13px] font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <InitialsAvatar name={user.name} />
              <span className="hidden max-w-[12rem] truncate lg:inline">{user.name}</span>
            </Link>
          ) : null}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              logout.mutate();
            }}
            disabled={logout.isPending}
          >
            <LogOut aria-hidden="true" size={17} strokeWidth={1.8} />
            {/* sr-only, not removed: this keeps the button's accessible name
                "Sign out" at every width, which is what a screen reader
                announces and what the e2e specs select on. */}
            <span className="sr-only">{t('auth.signOut')}</span>
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[212px] flex-none border-r bg-card md:block">
          {/* sticky at the header's height so the nav stays put while the content
              column scrolls, without the sidebar needing its own scrollbar. */}
          <div className="sticky top-0 h-[calc(100dvh-54px)]">
            <AppNav />
          </div>
        </aside>

        {/* min-w-0 so a wide child — the users table — scrolls inside this column
            instead of stretching it past the viewport. */}
        <main
          className={cn(
            'min-w-0 flex-1',
            fullBleed ? 'flex min-h-0 flex-col' : 'px-[26px] py-[22px]',
          )}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
