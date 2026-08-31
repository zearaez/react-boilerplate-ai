/// <reference types="vite/client" />

/**
 * Every environment variable the web app reads is declared here.
 *
 * This is not optional bookkeeping: `import.meta.env.VITE_TYPO` is `any` without
 * it, so a misspelled variable becomes `undefined` at runtime with no error.
 * Add a var here AND to .env.example AND to docs/env-vars.md.
 */
interface ImportMetaEnv {
  /** Base URL of the API. Ignored when VITE_ENABLE_MOCKS is 'true'. */
  readonly VITE_API_URL: string;
  /** 'true' turns on the MSW browser worker, so the app runs with no backend. */
  readonly VITE_ENABLE_MOCKS: string;
  /** Sentry DSN. Empty or absent disables error reporting entirely. */
  readonly VITE_SENTRY_DSN?: string;
  /** Deployment environment name, sent to Sentry: development | uat | production */
  readonly VITE_APP_ENV?: string;
  /**
   * 'false' leaves the in-app bug reporter unmounted. Anything else (including
   * absent) mounts it — it files to this app's own API, so there is no key in the
   * bundle to protect.
   */
  readonly VITE_BUG_REPORTER_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
