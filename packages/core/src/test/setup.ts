import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';

import { resetDb } from '@repo/mocks';
import { handlers } from '@repo/mocks/handlers';

import { useAuthStore } from '../features/auth/store';
import { setLogTransports } from '../logger';
import { configureCore, resetCore } from '../runtime';

import { createMemoryStorage } from './memory-storage';

export const TEST_API_URL = 'http://localhost:4000';

export const server = setupServer(...handlers);

beforeAll(() => {
  // `error` rather than `warn`: an unhandled request in a test almost always
  // means a typo'd path, and a warning is easy to scroll past.
  server.listen({ onUnhandledRequest: 'error' });
});

beforeEach(() => {
  // Swallow log output during tests, but keep the logger callable so code paths
  // that log are still exercised.
  setLogTransports([]);
  configureCore({ apiUrl: TEST_API_URL, storage: createMemoryStorage() });
});

afterEach(() => {
  server.resetHandlers();
  resetDb();
  useAuthStore.setState({ status: 'idle', tokens: null, user: null });
  resetCore();
});

afterAll(() => {
  server.close();
});
