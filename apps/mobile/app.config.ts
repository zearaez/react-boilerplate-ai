import type { ExpoConfig } from 'expo/config';

/**
 * Expo config as TypeScript so environment-dependent values are computed rather
 * than duplicated across three app.json files.
 *
 * Note what is NOT here: `newArchEnabled`. The legacy architecture was REMOVED
 * in SDK 55, so the flag is obsolete — setting it does nothing and suggests the
 * config was copied from an SDK 54 project.
 */
// Annotated rather than inferred: React Native's type declarations redeclare
// process.env with an `any` index signature. See lib/env.ts — that helper is for
// app code; this file runs in Node at config-load time, before module resolution
// into lib/ is guaranteed, so it narrows inline.
const APP_ENV: string =
  typeof process.env['APP_ENV'] === 'string' ? process.env['APP_ENV'] : 'development';

const NAME_BY_ENV: Record<string, string> = {
  development: 'Repo Starter (Dev)',
  uat: 'Repo Starter (UAT)',
  production: 'Repo Starter',
};

const BUNDLE_SUFFIX_BY_ENV: Record<string, string> = {
  development: '.dev',
  uat: '.uat',
  production: '',
};

const bundleId = `com.outcode.repostarter${BUNDLE_SUFFIX_BY_ENV[APP_ENV] ?? '.dev'}`;

const config: ExpoConfig = {
  name: NAME_BY_ENV[APP_ENV] ?? 'Repo Starter (Dev)',
  slug: 'repo-starter',
  version: '0.1.0',
  orientation: 'portrait',
  // Required by expo-router for deep links.
  scheme: 'repostarter',
  userInterfaceStyle: 'automatic',

  ios: {
    bundleIdentifier: bundleId,
    supportsTablet: true,
  },

  android: {
    package: bundleId,
    // No edgeToEdgeEnabled: it is not a valid key in SDK 57's schema. Android
    // edge-to-edge is on by default now, so the flag was removed rather than
    // renamed. Setting it is a copied-from-SDK-54 smell.
  },

  web: {
    // Expo's own web export. The primary web app is apps/web (Vite); this exists
    // so `expo export --platform all` works as a CI smoke test.
    bundler: 'metro',
    output: 'single',
  },

  plugins: ['expo-router', 'expo-secure-store', 'expo-localization'],

  experiments: {
    typedRoutes: true,
  },

  extra: {
    // EXPO_PUBLIC_* vars are inlined at build time and readable at runtime.
    // Never put a secret here — the bundle is shippable and readable.
    appEnv: APP_ENV,
  },
};

export default config;
