import { configureCore, createMemoryStorage, initI18n, resetCore } from '@repo/core';

/**
 * Mobile test setup.
 *
 * Note there is no MSW here. `msw/native` needs MessageEvent, EventTarget and
 * BroadcastChannel, none of which exist on Hermes, and its own docs call the
 * integration "potentially incomplete". All HTTP-level behaviour is tested in
 * @repo/core under Vitest against msw/node; these tests cover rendering.
 */
beforeEach(() => {
  configureCore({ apiUrl: 'http://localhost:4000', storage: createMemoryStorage() });
  initI18n('en');
});

afterEach(() => {
  resetCore();
});
