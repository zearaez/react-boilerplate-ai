import { ClickUpBugReporterRepository, normalizeContext } from '@outcode/bug-reporter-core';

import { isCoreConfigured, getRuntime } from '../../runtime';
import { useAuthStore } from '../auth/store';

import { collectBugReporterDiagnostics } from './diagnostics';
import { ApiBugReporterRepository } from './repository';

import type {
  BugReporterConfig,
  ReportContextRow,
  ReportQueueStorage,
  ThemeInput,
} from '@outcode/bug-reporter-core';

/**
 * ClickUp credentials.
 *
 * READ THIS BEFORE SETTING THEM. A ClickUp API key handed to the widget is a
 * key inside a client bundle: it ships to every user, it is readable with
 * devtools or `strings` on the .ipa, and it carries the permissions of whoever
 * minted it. That is why the boilerplate default is
 * {@link ApiBugReporterRepository} — the app's own API — and why these
 * credentials are optional and unset out of the box.
 *
 * Set them only for a build whose audience you control (a dev build, an internal
 * UAT channel), from a key with access to nothing but the two target lists. For
 * a public build, proxy ClickUp behind your backend and leave this undefined.
 */
export interface ClickUpCredentials {
  apiKey: string;
  problemListId: string;
  suggestionListId: string;
  /** Initial status for created tasks. Must already exist on the list. */
  status?: string;
}

export interface BugReporterConfigOptions {
  /** Shown in the report body and the ClickUp task. */
  appName: string;
  appVersion?: string;
  /** 'web' | 'ios' | 'android' — the app knows, core must not sniff for it. */
  platform: string;
  /** Static device facts the app can see and core cannot (model, OS version). */
  deviceInfo?: Record<string, unknown>;
  /** Static build facts (bundle id, build number, release channel). */
  packageInfo?: Record<string, unknown>;
  /** When set, files to ClickUp instead of this app's API. Read the warning above. */
  clickUp?: ClickUpCredentials;
  /** 'indigo' (default) | 'noir' | 'mint', or a partial token override. */
  theme?: ThemeInput;
  /** Backs the offline retry queue. Omit to disable queuing. */
  storage?: ReportQueueStorage;
  /** Name in the form footer ("Filing to …"). Defaults to the ClickUp/app name. */
  backendName?: string;
  /** Extra context rows, merged after the shared ones below. */
  collectContext?: () => ReportContextRow[] | Record<string, string>;
}

/**
 * Rows appended to every report on both platforms.
 *
 * The library already captures the consent-free environment (platform, OS,
 * viewport, language, route). This adds the two things only the app knows: who
 * is signed in, and which API they were talking to — the pair that turns "the
 * list was empty" into a report you can reproduce against the right backend.
 *
 * Only the user's own identity is attached, on their own report. Widen this and
 * you are writing a privacy decision, not a config default.
 */
function collectSharedContext(): ReportContextRow[] {
  const rows: ReportContextRow[] = [];
  const { status, user } = useAuthStore.getState();

  rows.push({ label: 'Session', value: status });
  if (user) {
    rows.push({ label: 'User', value: `${user.name} <${user.email}>` });
    rows.push({ label: 'User ID', value: user.id });
  }
  // Guarded because a report can be filed from a screen that renders before
  // configureCore() — getRuntime() throws rather than returning a placeholder.
  if (isCoreConfigured()) {
    rows.push({ label: 'API', value: getRuntime().apiUrl });
  }

  return rows;
}

/**
 * Build the BugReporterConfig both apps mount.
 *
 * This lives in @repo/core so the two platforms cannot drift on what a report
 * contains — the whole point of sharing logic. It is plain config, not a hook,
 * so nothing here touches React.
 */
export function createBugReporterConfig(options: BugReporterConfigOptions): BugReporterConfig {
  const repository = options.clickUp
    ? new ClickUpBugReporterRepository(options.clickUp)
    : new ApiBugReporterRepository();

  return {
    appName: options.appName,
    appVersion: options.appVersion,
    theme: options.theme ?? 'indigo',
    repository,
    backendName: options.backendName ?? (options.clickUp ? 'ClickUp' : options.appName),
    defaultPriority: 'normal',
    deviceInfo: { platform: options.platform, ...options.deviceInfo },
    packageInfo: options.packageInfo ?? {},
    collectDiagnostics: collectBugReporterDiagnostics,
    collectContext: () => [
      ...collectSharedContext(),
      ...normalizeContext(options.collectContext?.()),
    ],
    storage: options.storage,
    // Cap the capture so a 3x-density tablet screenshot is not a multi-megabyte
    // upload. Format is left at the library default (PNG) deliberately:
    // ClickUp's attachment upload hardcodes a .png filename and image/png type,
    // so asking for JPEG here would attach mislabelled bytes.
    screenshot: { maxWidth: 1280 },
  };
}
