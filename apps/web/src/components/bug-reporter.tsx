import { useEffect, useMemo } from 'react';

import { mountBugReporter } from '@outcode/bug-reporter-web';

import { createBugReporterConfig, useTranslation } from '@repo/core';

/**
 * The in-app bug reporter: a floating button that screenshots the page, lets the
 * user annotate it, and files a report. Rendered once, at the app root.
 *
 * It renders NOTHING itself. @outcode/bug-reporter-web is deliberately
 * framework-agnostic vanilla DOM — mountBugReporter() appends its own element to
 * document.body and drives the flow imperatively, which is how it gets into the
 * browser's top layer and survives modal libraries that set
 * `body { pointer-events: none }`. React's job here is only lifecycle.
 *
 * Mounted at the root rather than inside <AppShell> on purpose: AppShell only
 * wraps authenticated routes, and a reporter that cannot report the login screen
 * is missing the screens most worth reporting.
 */
export function BugReporter(): null {
  const { t } = useTranslation();

  const label = t('bugReporter.button');

  // useMemo is load-bearing here, not an optimisation: `config` is a dependency
  // of the effect below, and a fresh object every render would tear the widget
  // down and rebuild it on every parent render. It re-runs only when `t` changes
  // identity, i.e. on a language change.
  const config = useMemo(
    () =>
      createBugReporterConfig({
        appName: t('common.appName'),
        platform: 'web',
        packageInfo: { environment: import.meta.env.VITE_APP_ENV ?? 'development' },
        // No `storage`: the library falls back to localStorage for its offline
        // retry queue on its own. Passing this repo's storage adapter would not
        // work anyway — CoreStorage is async and get/set/remove, the queue wants
        // getItem/setItem/removeItem.
      }),
    [t],
  );

  useEffect(() => {
    const handle = mountBugReporter(config, { label });
    // destroy() also covers StrictMode's deliberate double-invoke in dev —
    // without it you get two floating buttons.
    return () => {
      handle.destroy();
    };
  }, [config, label]);

  return null;
}
