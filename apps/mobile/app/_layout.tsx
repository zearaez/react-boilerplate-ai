// MUST be first: configures @repo/core before any route can call getRuntime().
import '../app-runtime';
import '../global.css';

import * as React from 'react';

import { getLocales } from 'expo-localization';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import {
  BugReporterCaptureRefProvider,
  BugReporterScreenCaptureView,
} from '@outcode/bug-reporter-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  bootstrapSession,
  configureLogger,
  initI18n,
  installBugReporterDiagnostics,
  resolveLanguage,
  useAuthStore,
  useTranslation,
} from '@repo/core';

import { AppBugReporter } from '~/components/bug-reporter';
import { readEnv } from '~/lib/env';
import { queryClient } from '~/lib/query-client';
import { wireQueryFocusManager } from '~/lib/query-platform';

void SplashScreen.preventAutoHideAsync();

// Both of these are the APP's job: @repo/core never sniffs its environment, because
// Hermes, browsers and Node disagree about every global worth sniffing.
configureLogger({
  level: __DEV__ ? 'debug' : 'info',
  format: __DEV__ ? 'pretty' : 'json',
});

// Language detection is the APP's job — @repo/core cannot import expo-*.
// Web does the same thing with navigator.language.
// .at(0) rather than [0]: expo-localization types getLocales() as a non-empty
// array, so `[0]?.` reads as an unnecessary optional chain to the linter — but the
// array genuinely can be empty on a misconfigured device. .at() returns
// `T | undefined`, which is both honest and lint-clean.
initI18n(resolveLanguage(getLocales().at(0)?.languageTag));

// Starts the rolling console-breadcrumb buffer every bug report carries. At
// module scope so a warning logged during startup is still buffered later.
installBugReporterDiagnostics();

// Ships enabled. EXPO_PUBLIC_BUG_REPORTER_ENABLED=false leaves it unmounted —
// worth doing for a store build, since screen capture needs a dev build anyway.
const bugReporterEnabled = readEnv('EXPO_PUBLIC_BUG_REPORTER_ENABLED') !== 'false';

export default function RootLayout() {
  const { t } = useTranslation();
  const status = useAuthStore((state) => state.status);

  React.useEffect(() => {
    // Same call as web. The keychain answers first here, so the cookie probe only
    // runs on a genuinely fresh install — and the splash screen stays up for
    // both, which is what keeps the login screen from flashing.
    void bootstrapSession().finally(() => {
      void SplashScreen.hideAsync();
    });
  }, []);

  React.useEffect(() => {
    const subscription = wireQueryFocusManager();
    return () => {
      subscription.remove();
    };
  }, []);

  // Keep the splash screen up while the persisted session is read. Rendering the
  // auth stack here would flash the login screen at an already-signed-in user.
  if (status === 'idle' || status === 'hydrating') return null;

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          {/*
            Native screen capture is VIEW-based: react-native-view-shot snapshots
            the view it is given, so the whole navigator has to sit inside this
            wrapper or reports arrive with a blank screenshot. A <Modal> lives in
            its own native window OUTSIDE this view, so a report filed over a modal
            shows the screen behind it — describe the dialog in the report, or wrap
            the modal's own content in a capture view.
          */}
          <BugReporterCaptureRefProvider>
            <BugReporterScreenCaptureView style={{ flex: 1 }}>
              {/*
                <Stack.Protected> is the CURRENT expo-router auth pattern. The old
                approach — a useEffect that calls router.replace() — is explicitly
                superseded in the SDK 53+ docs, and it flickers.

                Note: guards are a routing concern, not a security boundary. The API
                still authorises every request.
              */}
              <Stack screenOptions={{ headerShown: true }}>
                <Stack.Protected guard={status === 'authenticated'}>
                  <Stack.Screen name="(app)" options={{ headerShown: false }} />
                </Stack.Protected>

                <Stack.Protected guard={status === 'unauthenticated'}>
                  <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
                  {/*
                    The reset screens keep their header: they are pushed from the login
                    screen, and a stack with no way back is how people get stranded on a
                    form they opened by accident.
                  */}
                  <Stack.Screen
                    name="(auth)/forgot-password"
                    options={{ title: t('auth.forgotPasswordTitle') }}
                  />
                  <Stack.Screen
                    name="(auth)/reset-password"
                    options={{ title: t('auth.resetPasswordTitle') }}
                  />
                </Stack.Protected>
              </Stack>
            </BugReporterScreenCaptureView>

            {/* LAST inside the provider, and outside the capture view: mounting
                order is what puts it above in-tree overlays, and keeping it out of
                the captured view keeps the button itself out of the screenshot. */}
            {bugReporterEnabled ? <AppBugReporter /> : null}
          </BugReporterCaptureRefProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
