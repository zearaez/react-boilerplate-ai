// `pnpm gen feature` appends new handler imports directly below this line. The
// anchor is FIRST so the appended import lands inside a contiguous import block —
// eslint --fix can then sort it, but it cannot move an import across a comment.
// @gen:handler-imports
import { authHandlers } from './auth';
import { bugReportHandlers } from './bug-reports';
import { postHandlers } from './posts';
import { profileHandlers } from './profile';

/**
 * The one handler array. Three consumers use it unchanged:
 *   - apps/web dev server        -> msw/browser  setupWorker(...handlers)
 *   - vitest (web + core tests)  -> msw/node     setupServer(...handlers)
 *   - apps/mobile on a device    -> packages/mocks/src/server.ts (express)
 *
 * `msw/native` is deliberately NOT one of them: it pulls in MessageEvent,
 * EventTarget and BroadcastChannel, none of which exist on Hermes, and its own
 * docs describe the integration as "potentially incomplete". The express server
 * runs the identical handlers with zero Hermes risk.
 */
export const handlers = [
  ...authHandlers,
  ...bugReportHandlers,
  ...postHandlers,
  ...profileHandlers,
  // `pnpm gen feature` appends new handler arrays below this marker.
  // @gen:handlers
];

export { authHandlers, bugReportHandlers, postHandlers, profileHandlers };
