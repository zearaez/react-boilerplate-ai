import { normalizeContext } from '@outcode/bug-reporter-core';
import { HttpResponse, http } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ALWAYS_FAILS_REPORT_TITLE, receivedBugReports } from '@repo/mocks';

import { getApiClient } from '../../../api/client';
import { TEST_API_URL, server } from '../../../test/setup';
import { useAuthStore } from '../../auth/store';
import { createBugReporterConfig } from '../config';
import {
  collectBugReporterDiagnostics,
  installBugReporterDiagnostics,
  recordFailedRequest,
  resetBugReporterDiagnostics,
} from '../diagnostics';
import { ApiBugReporterRepository } from '../repository';

import type {
  BugReporterConfig,
  CreateReportParams,
  ReportContextRow,
} from '@outcode/bug-reporter-core';

/**
 * `collectContext` is typed as returning rows OR a `{label: value}` object, so a
 * caller cannot index the result directly. normalizeContext is the library's own
 * narrowing helper — the same one the widget uses.
 */
async function contextRows(config: BugReporterConfig): Promise<ReportContextRow[]> {
  return normalizeContext(await config.collectContext?.());
}

function params(overrides: Partial<CreateReportParams> = {}): CreateReportParams {
  return {
    title: 'Save button does nothing',
    description: 'Tapped Save on the profile screen, nothing happened.',
    severity: 'high',
    type: 'bug',
    isReportingProblem: true,
    deviceInfo: { platform: 'web' },
    packageInfo: { appName: 'Repo Starter' },
    ...overrides,
  };
}

afterEach(() => {
  resetBugReporterDiagnostics();
});

describe('ApiBugReporterRepository', () => {
  it('files a report and returns the ticket id', async () => {
    const result = await new ApiBugReporterRepository().createReport(params());

    expect(result.success).toBe(true);
    expect(result.id).toMatch(/^BUG-\d{3}$/);
  });

  it('forwards the context rows and diagnostics the apiUrl path would have dropped', async () => {
    // This is the reason the default backend is a repository and not the
    // library's `apiUrl` shortcut — that path sends only title, description,
    // screenshot and metadata.
    await new ApiBugReporterRepository().createReport(
      params({
        context: [{ label: 'Route', value: '/profile' }],
        diagnostics: { breadcrumbs: [{ level: 'error', message: 'boom' }] },
      }),
    );

    const received = receivedBugReports().at(-1);
    expect(received?.context).toEqual([{ label: 'Route', value: '/profile' }]);
    expect(received?.diagnostics).toEqual({
      breadcrumbs: [{ level: 'error', message: 'boom' }],
    });
  });

  it('resolves with success:false instead of throwing when the backend fails', async () => {
    // A throw here escapes the widget's submit handler and becomes an unhandled
    // rejection while the user watches a spinner that never resolves.
    const result = await new ApiBugReporterRepository().createReport(
      params({ title: ALWAYS_FAILS_REPORT_TITLE }),
    );

    expect(result.success).toBe(false);
    expect(result.message).toBeTruthy();
  });

  it('resolves with success:false when the response does not match the schema', async () => {
    server.use(
      http.post('*/api/bug-reports', () => HttpResponse.json({ notAnId: true }, { status: 201 })),
    );

    const result = await new ApiBugReporterRepository().createReport(params());
    expect(result.success).toBe(false);
  });

  it('accepts a report from an unauthenticated user', async () => {
    // The login screen is where the worst bugs live, so this must not 401.
    expect(useAuthStore.getState().status).toBe('idle');

    const result = await new ApiBugReporterRepository().createReport(params());
    expect(result.success).toBe(true);
  });
});

describe('createBugReporterConfig', () => {
  it('defaults to this app’s API, with no third-party key in the bundle', () => {
    const config = createBugReporterConfig({ appName: 'Repo Starter', platform: 'web' });

    expect(config.repository).toBeInstanceOf(ApiBugReporterRepository);
    expect(config.backendName).toBe('Repo Starter');
    expect(config.theme).toBe('indigo');
  });

  it('switches to ClickUp only when credentials are supplied', () => {
    const config = createBugReporterConfig({
      appName: 'Repo Starter',
      platform: 'ios',
      clickUp: { apiKey: 'pk_test', problemListId: '1', suggestionListId: '2' },
    });

    expect(config.repository).not.toBeInstanceOf(ApiBugReporterRepository);
    expect(config.backendName).toBe('ClickUp');
  });

  it('reports the platform the app declared rather than sniffing for it', () => {
    const config = createBugReporterConfig({
      appName: 'Repo Starter',
      platform: 'android',
      deviceInfo: { osVersion: '35' },
    });

    expect(config.deviceInfo).toEqual({ platform: 'android', osVersion: '35' });
  });

  describe('collectContext', () => {
    it('attaches the signed-in user and the API being used', async () => {
      useAuthStore.setState({
        status: 'authenticated',
        tokens: {
          accessToken: 'access-1',
          accessTokenExpiresAt: '2099-01-01T00:00:00.000Z',
          refreshToken: 'refresh-1',
          refreshTokenExpiresAt: '2099-01-01T00:00:00.000Z',
        },
        user: {
          id: 'user-1',
          name: 'Anisha Shrestha',
          email: 'anisha@example.com',
          phone: null,
          role: 'member',
          createdAt: '2026-01-04T09:00:00.000Z',
        },
      });

      const config = createBugReporterConfig({ appName: 'Repo Starter', platform: 'web' });
      const rows = await contextRows(config);

      expect(rows).toEqual(
        expect.arrayContaining([
          { label: 'Session', value: 'authenticated' },
          { label: 'User', value: 'Anisha Shrestha <anisha@example.com>' },
          { label: 'User ID', value: 'user-1' },
          { label: 'API', value: TEST_API_URL },
        ]),
      );
    });

    it('omits the user rows when nobody is signed in', async () => {
      const config = createBugReporterConfig({ appName: 'Repo Starter', platform: 'web' });
      const rows = await contextRows(config);

      expect(rows).toEqual([
        { label: 'Session', value: 'idle' },
        { label: 'API', value: TEST_API_URL },
      ]);
    });

    it('merges the caller’s extra rows after the shared ones', async () => {
      const config = createBugReporterConfig({
        appName: 'Repo Starter',
        platform: 'web',
        collectContext: () => ({ Network: 'wifi' }),
      });
      const rows = await contextRows(config);

      expect(rows.at(-1)).toEqual({ label: 'Network', value: 'wifi' });
    });
  });
});

describe('diagnostics', () => {
  beforeEach(() => {
    installBugReporterDiagnostics();
  });

  it('records the last failed request, so a report says what broke just before', async () => {
    // Registered explicitly: the shared server runs with onUnhandledRequest:
    // 'error', so an unrouted path fails the test instead of returning a 404.
    server.use(
      http.get('*/api/boom', () => HttpResponse.json({ message: 'nope' }, { status: 500 })),
    );

    // The axios interceptor is the source, so this asserts the real wiring
    // rather than a direct call to recordFailedRequest().
    await expect(getApiClient().get('/api/boom')).rejects.toThrow();

    const diagnostics = collectBugReporterDiagnostics();
    expect(diagnostics['lastFailedApiCall']).toMatchObject({
      method: 'GET',
      url: '/api/boom',
      status: 500,
    });
  });

  it('is idempotent, so StrictMode’s double-invoke cannot double the patches', () => {
    installBugReporterDiagnostics();
    installBugReporterDiagnostics();

    recordFailedRequest({ method: 'GET', url: '/x', status: 500 });
    const diagnostics = collectBugReporterDiagnostics();

    expect(diagnostics['lastFailedApiCall']).toMatchObject({ url: '/x' });
    // A doubled install would have produced two breadcrumb buffers, and the
    // console patch could no longer be unwound.
    expect(Array.isArray(diagnostics['breadcrumbs'])).toBe(true);
  });

  it('omits lastFailedApiCall entirely when nothing has failed', () => {
    expect(collectBugReporterDiagnostics()).not.toHaveProperty('lastFailedApiCall');
  });
});
