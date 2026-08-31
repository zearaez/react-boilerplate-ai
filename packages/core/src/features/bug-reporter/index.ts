/**
 * Bug reporter — shared wiring for @outcode/bug-reporter-{web,native}.
 *
 * The UI is platform-specific and lives in each app:
 *   web    -> apps/web/src/components/bug-reporter.tsx      (mountBugReporter)
 *   mobile -> apps/mobile/components/bug-reporter.tsx       (<BugReporterButton>)
 *
 * Everything that decides what a report CONTAINS is here, so the two platforms
 * file the same report. See docs/bug-reporter.md.
 */

export { createBugReporterConfig } from './config';
export type { BugReporterConfigOptions, ClickUpCredentials } from './config';
export {
  collectBugReporterDiagnostics,
  installBugReporterDiagnostics,
  recordFailedRequest,
  resetBugReporterDiagnostics,
} from './diagnostics';
export { ApiBugReporterRepository } from './repository';
export { createBugReport } from './api';
export { bugReportCreatedSchema } from './schemas';
export type { BugReportCreated } from './schemas';

// Re-exported so the apps get the reporter's types from @repo/core and only the
// UI package needs to be a direct dependency of each app.
export type {
  BugReporterConfig,
  BugReporterTheme,
  BugReporterThemeName,
  CreateReportParams,
  IBugReporterRepository,
  ReportContextRow,
  ReportQueueStorage,
  ThemeInput,
} from '@outcode/bug-reporter-core';
