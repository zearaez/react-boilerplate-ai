import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';

import { configureCore, createMemoryStorage, initI18n, resetCore, useAuthStore } from '@repo/core';
import { resetDb } from '@repo/mocks';
import { handlers } from '@repo/mocks/handlers';

import { useUiStore } from '@/stores/ui-store';

export const server = setupServer(...handlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  // Real translations, not a stub: a test that asserts on "posts.listTitle"
  // instead of "Posts" passes even when a key is missing from en.json.
  initI18n('en');
});

beforeEach(() => {
  configureCore({ apiUrl: 'http://localhost:4000', storage: createMemoryStorage() });
});

afterEach(() => {
  cleanup();
  // App-local UI state is a module-level store, so it leaks between tests unless
  // reset here — a stale search term would silently filter another test's list.
  useUiStore.setState({ postsSearch: '', postsDensity: 'comfortable' });
  server.resetHandlers();
  resetDb();
  useAuthStore.setState({ status: 'idle', tokens: null, user: null });
  resetCore();
});

afterAll(() => {
  server.close();
});
