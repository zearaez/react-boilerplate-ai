import { logger } from '../../logger';

import { createBugReport } from './api';

import type {
  BugReportResponse,
  CreateReportParams,
  IBugReporterRepository,
} from '@outcode/bug-reporter-core';

/**
 * Files reports against this app's own API.
 *
 * This is the default backend, and it is a `repository` rather than the
 * library's simpler `apiUrl` option for one concrete reason: the `apiUrl` path
 * POSTs only title/description/screenshot/metadata and DROPS `context` and
 * `diagnostics` on the floor. Those two are the entire difference between "it's
 * broken" and a report someone can act on, so the boilerplate does not use it.
 *
 * Swap this for `ClickUpBugReporterRepository` — or your own class implementing
 * `IBugReporterRepository` — by passing `clickUp` credentials to
 * createBugReporterConfig(). See docs/bug-reporter.md.
 */
export class ApiBugReporterRepository implements IBugReporterRepository {
  async createReport(params: CreateReportParams): Promise<BugReportResponse> {
    try {
      const created = await createBugReport(params);
      return {
        success: true,
        id: created.id,
        message: created.url ?? 'Submitted',
      };
    } catch (error) {
      // Resolve, never reject. The widget reads `success` to decide between
      // showing the error inline and moving the report to the offline retry
      // queue; a thrown error escapes that logic and surfaces as an unhandled
      // rejection while the user stares at a spinner.
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Bug report submission failed', { message });
      return { success: false, message };
    }
  }
}
