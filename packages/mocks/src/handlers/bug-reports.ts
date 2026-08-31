import { HttpResponse, http } from 'msw';

import { registerReset } from '../db';

/**
 * Mock backend for the in-app bug reporter.
 *
 * Deliberately accepts UNAUTHENTICATED reports. Every other handler here 401s
 * without a token, but a bug reporter that only works once you are signed in
 * cannot receive a report about the login screen — which is exactly where the
 * worst bugs are. The real endpoint should behave the same way and treat the
 * token as attribution, not admission.
 */

/** Reports received this session, so a test can assert on what was filed. */
const received: ReceivedBugReport[] = [];

export interface ReceivedBugReport {
  title: string;
  description: string;
  severity?: string;
  type?: string;
  isReportingProblem: boolean;
  /** Length only: a base64 screenshot is megabytes and never worth asserting on. */
  screenshotBytes: number;
  context: { label: string; value: string }[];
  diagnostics?: Record<string, unknown>;
}

export function resetBugReports(): void {
  received.length = 0;
}

export function receivedBugReports(): readonly ReceivedBugReport[] {
  return received;
}

registerReset(resetBugReports);

interface BugReportRequestBody {
  title?: unknown;
  description?: unknown;
  severity?: unknown;
  type?: unknown;
  isReportingProblem?: unknown;
  screenshotBase64?: unknown;
  context?: unknown;
  diagnostics?: unknown;
}

/** The title that makes the mock fail, mirroring ALWAYS_FAILS_POST_ID for posts. */
export const ALWAYS_FAILS_REPORT_TITLE = 'report-fail';

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export const bugReportHandlers = [
  http.post('*/api/bug-reports', async ({ request }) => {
    const body = (await request.json()) as BugReportRequestBody;
    const title = asString(body.title).trim();
    const description = asString(body.description).trim();

    // Mirror the server-side rule the widget's own form already enforces. A mock
    // laxer than the server makes a client-only guard look like a real one.
    if (title.length === 0 || description.length === 0) {
      return HttpResponse.json(
        {
          message: 'Validation failed.',
          errors: {
            ...(title.length === 0 ? { title: ['A title is required.'] } : {}),
            ...(description.length === 0 ? { description: ['A description is required.'] } : {}),
          },
        },
        { status: 422 },
      );
    }

    // Deliberate failure path, so the offline-queue and error states are
    // reachable in the demo without unplugging the network.
    if (title === ALWAYS_FAILS_REPORT_TITLE) {
      return HttpResponse.json({ message: 'Bug tracker unavailable.' }, { status: 500 });
    }

    received.push({
      title,
      description,
      severity: typeof body.severity === 'string' ? body.severity : undefined,
      type: typeof body.type === 'string' ? body.type : undefined,
      isReportingProblem: body.isReportingProblem !== false,
      screenshotBytes: asString(body.screenshotBase64).length,
      context: Array.isArray(body.context)
        ? (body.context as { label: string; value: string }[])
        : [],
      diagnostics:
        typeof body.diagnostics === 'object' && body.diagnostics !== null
          ? (body.diagnostics as Record<string, unknown>)
          : undefined,
    });

    return HttpResponse.json(
      { id: `BUG-${String(received.length).padStart(3, '0')}` },
      { status: 201 },
    );
  }),
];
