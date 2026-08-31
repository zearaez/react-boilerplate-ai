import { getApiClient } from '../../api/client';
import { toApiError } from '../../api/errors';

import { type BugReportCreated, bugReportCreatedSchema } from './schemas';

import type { CreateReportParams } from '@outcode/bug-reporter-core';

/**
 * The wire body for POST /api/bug-reports.
 *
 * Named separately from `CreateReportParams` because that type is the library's
 * in-memory shape, and an endpoint contract should not silently change when the
 * library adds a field. snake_case matches the rest of nothing in this repo — it
 * is camelCase on purpose, consistent with /api/posts and /api/profile.
 */
interface BugReportBody {
  title: string;
  description: string;
  severity?: string;
  type?: string;
  priority?: string;
  /** Raw base64, no data-URL prefix. Absent when the user skipped the capture. */
  screenshotBase64?: string;
  /** `true` = a problem, `false` = a suggestion. */
  isReportingProblem: boolean;
  tags?: string[];
  /** Auto-captured rows the widget showed the user before they submitted. */
  context?: { label: string; value: string }[];
  deviceInfo: Record<string, unknown>;
  packageInfo: Record<string, unknown>;
  diagnostics?: Record<string, unknown>;
}

function toBugReportBody(params: CreateReportParams): BugReportBody {
  return {
    title: params.title,
    description: params.description,
    severity: params.severity,
    type: params.type,
    priority: params.priority,
    screenshotBase64: params.screenshotBase64,
    isReportingProblem: params.isReportingProblem ?? true,
    tags: params.tags,
    context: params.context,
    deviceInfo: params.deviceInfo,
    packageInfo: params.packageInfo,
    diagnostics: params.diagnostics,
  };
}

/**
 * File a bug report against this app's own API.
 *
 * Goes through getApiClient() rather than raw fetch so a report inherits the
 * baseURL, the timeout and the Authorization header the rest of the app uses —
 * which is what lets the backend attribute the report to a signed-in user
 * without the client having to send credentials of its own.
 */
export async function createBugReport(params: CreateReportParams): Promise<BugReportCreated> {
  try {
    const response = await getApiClient().post('/api/bug-reports', toBugReportBody(params));
    return bugReportCreatedSchema.parse(response.data);
  } catch (error) {
    throw toApiError(error);
  }
}
