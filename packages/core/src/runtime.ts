/**
 * The ENTIRE platform surface of @repo/core. Two members.
 *
 * Web and native differ in exactly two ways that this package cares about:
 * where the API lives, and how a token is persisted. Everything else is shared
 * logic. Resist adding a third member — each one is a thing an agent has to
 * learn before it can write a query hook, and a thing that can be wired up
 * wrong in one app but not the other.
 *
 * Deliberately NOT here:
 *   - onUnauthorized / navigation. The 401 interceptor calls
 *     useAuthStore.signOut(); web's <ProtectedLayout> and native's
 *     <Stack.Protected> both already react to that store. Neither platform
 *     needs to inject a navigator.
 *   - A DI container. It would be indirection an agent must learn first.
 *   - React context. api/client.ts must work outside a React tree.
 */

export interface CoreStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface CoreRuntime {
  /** Base URL of the API, e.g. http://localhost:4000 */
  apiUrl: string;
  /**
   * Async on BOTH platforms, even though localStorage is synchronous.
   * expo-secure-store is async, and one async code path in core beats two.
   */
  storage: CoreStorage;
}

let runtime: CoreRuntime | null = null;
const resetListeners = new Set<() => void>();

/**
 * Call once, at module scope, from apps/<app>/app-runtime.ts — which must be
 * the first import in the app's entry file.
 */
export function configureCore(next: CoreRuntime): void {
  runtime = next;
}

export function getRuntime(): CoreRuntime {
  if (runtime === null) {
    throw new Error(
      '@repo/core: configureCore() has not been called.\n' +
        'Import ./app-runtime as the FIRST import of your entry file ' +
        '(apps/web/src/main.tsx or apps/mobile/app/_layout.tsx).',
    );
  }
  return runtime;
}

export function isCoreConfigured(): boolean {
  return runtime !== null;
}

/**
 * Lets modules that cache runtime-derived state (the axios instance) drop it
 * when tests reconfigure core. Avoids an import cycle between runtime and api.
 */
export function onCoreReset(listener: () => void): void {
  resetListeners.add(listener);
}

/** Test-only. Never call this from application code. */
export function resetCore(): void {
  runtime = null;
  for (const listener of resetListeners) listener();
}
