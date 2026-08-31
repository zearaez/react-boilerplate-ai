import * as React from 'react';

import { Platform } from 'react-native';

import Constants from 'expo-constants';

import { BugReporterButton } from '@outcode/bug-reporter-native';

import { createBugReporterConfig, useTranslation } from '@repo/core';

import { readEnv } from '~/lib/env';

/**
 * The in-app bug reporter's floating button.
 *
 * Mounted LAST at the app root (see app/_layout.tsx) so it paints above in-tree
 * overlays — it sits at elevation 24, the Material ceiling dialogs and menus use,
 * and mounting order is what breaks the tie at equal elevation.
 *
 * A host <Modal> is the one case styling cannot win: React Native presents each
 * Modal in its own native window above the whole app, so nothing in the view tree
 * can rise above one. To report from inside your own modal, take a ref to this
 * button (BugReporterButtonHandle) and call open() — the reporter's overlays are
 * then presented after yours. See docs/bug-reporter.md.
 */
export function AppBugReporter() {
  const { t } = useTranslation();

  // Stable identity: BugReporterButton holds this config for the lifetime of an
  // open report, so handing it a new object mid-flow would swap the backend under
  // an in-progress submit.
  const config = React.useMemo(
    () =>
      createBugReporterConfig({
        appName: t('common.appName'),
        appVersion: Constants.expoConfig?.version,
        platform: Platform.OS,
        deviceInfo: {
          // Platform.Version is a string on Android and a number on iOS.
          osVersion: String(Platform.Version),
        },
        packageInfo: {
          environment: readEnv('APP_ENV') ?? 'development',
          nativeBuild:
            Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode,
        },
        // No `storage`: the offline retry queue needs an AsyncStorage-shaped
        // adapter, and this app persists only the session, in expo-secure-store —
        // whose 2 KB-per-value limit a base64 screenshot blows through instantly.
        // A failed report reports its failure rather than being silently kept.
      }),
    [t],
  );

  return <BugReporterButton config={config} label={t('bugReporter.button')} />;
}
