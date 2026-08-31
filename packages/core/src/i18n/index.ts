import i18next, { type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';

/**
 * Shared translation bundle (audit items 13.1-13.3).
 *
 * Both apps use the same resources on purpose: the demo slice is mirrored on
 * web and native, so sharing the strings is what stops the two copies drifting
 * into "Sign in" vs "Log in".
 *
 * LANGUAGE DETECTION IS THE APP'S JOB, not core's — web reads
 * navigator.language, native reads expo-localization, and neither of those may
 * be imported here. Each app passes the result to initI18n().
 */
export const defaultNS = 'translation';
export const supportedLanguages = ['en'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export const resources = {
  en: { [defaultNS]: en },
} as const;

export function isSupportedLanguage(value: string): value is SupportedLanguage {
  return (supportedLanguages as readonly string[]).includes(value);
}

/** Narrows an arbitrary locale tag ("en-GB", "fr") to something we ship. */
export function resolveLanguage(tag: string | undefined): SupportedLanguage {
  const base = (tag ?? 'en').split('-')[0]?.toLowerCase() ?? 'en';
  return isSupportedLanguage(base) ? base : 'en';
}

let initialised = false;

export function initI18n(language: string | undefined): I18nInstance {
  if (initialised) return i18next;

  void i18next.use(initReactI18next).init({
    resources,
    lng: resolveLanguage(language),
    fallbackLng: 'en',
    defaultNS,
    interpolation: { escapeValue: false },
    returnNull: false,
  });

  initialised = true;
  return i18next;
}

/** Test-only. */
export function resetI18n(): void {
  initialised = false;
}

/**
 * Non-React translation, for error mappers and logs. In components always use
 * useTranslation() so a language change re-renders.
 */
export function t(key: string, options?: Record<string, unknown>): string {
  return i18next.t(key, options ?? {});
}

export { Trans, useTranslation } from 'react-i18next';
export type { i18n as I18nInstance } from 'i18next';
