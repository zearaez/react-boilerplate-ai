/**
 * @repo/core — all shared logic for both apps.
 *
 * Rules for this package, enforced by packages/config/eslint/logic-only.js:
 *   - No JSX. No react-native. No expo-*. No react-dom. No window/document.
 *   - Platform differences arrive through configureCore(), nothing else.
 *
 * If the linter blocks an import here, the code belongs in an app, not in core.
 * Do not add an eslint-disable.
 */

// --- runtime -----------------------------------------------------------------
export { configureCore, getRuntime, isCoreConfigured, onCoreReset, resetCore } from './runtime';
export type { CoreRuntime, CoreStorage } from './runtime';
export { createMemoryStorage } from './storage/memory';
export type { MemoryStorage } from './storage/memory';

// --- observability -----------------------------------------------------------
export {
  configureLogger,
  getConsoleTransport,
  logger,
  redact,
  setLogLevel,
  setLogTransports,
} from './logger';
export type { LogContext, LogFormat, LogLevel, LogRecord, LogTransport } from './logger';

// --- api ---------------------------------------------------------------------
export { getApiClient } from './api/client';
export { ApiError, isApiError, parseRequestBody, toApiError, zodToFieldErrors } from './api/errors';
export type { ApiErrorKind } from './api/errors';
export {
  DEFAULT_PAGE_SIZE,
  flattenPages,
  nextPageParam,
  paginated,
  paginationParamsSchema,
} from './api/pagination';
export type { Page, PaginationParams } from './api/pagination';

// --- query -------------------------------------------------------------------
export { DEFAULT_GC_TIME_MS, DEFAULT_STALE_TIME_MS, createQueryClient } from './query/client';

// --- i18n --------------------------------------------------------------------
export {
  Trans,
  initI18n,
  isSupportedLanguage,
  resetI18n,
  resolveLanguage,
  resources,
  supportedLanguages,
  t,
  useTranslation,
} from './i18n';
export type { SupportedLanguage } from './i18n';

export { DEFAULT_DEBOUNCE_MS, useDebouncedValue } from './hooks/use-debounced-value';

// --- features ----------------------------------------------------------------
export * from './features/auth';
export * from './features/bug-reporter';
export * from './features/posts';
export * from './features/profile';
// `pnpm gen feature` appends new feature barrels below this marker.
// @gen:exports
