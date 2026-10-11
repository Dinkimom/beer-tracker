import type { IssueTrackerProviderKind } from './types';

import { z } from 'zod';

import { cleanTrackerCloudId } from '@/lib/atlassianOAuth/jiraCloudApiUrl';

import { issueTrackerWebBaseFromApiUrl } from './issueTrackerUi';
import { cleanJiraBasicAuthEmail } from './jiraBasicAuthEmail';
import { parseIssueTrackerProviderKind } from './providerKind';
import { ISSUE_TRACKER_PROVIDER_KINDS } from './types';

/** Публичный API Яндекс Трекера; для Jira URL всегда задаётся явно. */
export const YANDEX_TRACKER_DEFAULT_API_URL = 'https://api.tracker.yandex.net/v3';

const IssueTrackerProviderKindSchema = z.preprocess((raw) => {
  if (raw === undefined || raw === null || raw === '') {
    return undefined;
  }
  if (typeof raw !== 'string') {
    return raw;
  }
  return parseIssueTrackerProviderKind(raw) ?? raw;
}, z.enum(ISSUE_TRACKER_PROVIDER_KINDS).optional());

const IssueTrackerSettingsSchema = z
  .object({
    /** REST root трекера (`…/v3`, `…/rest/api/2|3`). Для Jira Cloud — URL сайта, не OAuth-шлюз. */
    apiUrl: z.string().optional(),
    /** Email Atlassian-аккаунта org API-токена (Jira Cloud Basic). Не секрет. */
    basicAuthEmail: z.string().optional(),
    /** Atlassian cloudId (user OAuth REST via `api.atlassian.com/ex/jira/{id}`). */
    cloudId: z.string().optional(),
    provider: IssueTrackerProviderKindSchema,
  })
  .strict();

type IssueTrackerSettings = z.infer<typeof IssueTrackerSettingsSchema>;

/** Подключённый трекер организации. */
export interface OrganizationIssueTrackerConfig {
  apiUrl: string;
  kind: IssueTrackerProviderKind;
}

function extractIssueTrackerSettingsJson(settingsRoot: unknown): unknown {
  if (settingsRoot === null || settingsRoot === undefined) {
    return {};
  }
  if (typeof settingsRoot !== 'object' || Array.isArray(settingsRoot)) {
    return {};
  }
  const raw = (settingsRoot as Record<string, unknown>).issueTracker;
  if (raw === null || raw === undefined) {
    return {};
  }
  return raw;
}

export function parseIssueTrackerSettings(raw: unknown): IssueTrackerSettings {
  const result = IssueTrackerSettingsSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid issue tracker settings: ${result.error.issues.map((i) => i.message).join('; ')}`
    );
  }
  return result.data;
}

/**
 * Трекер организации из `settings.issueTracker`. `null` — трекер не выбран
 * или для Jira не задан URL API: организацию нужно подключить в админке.
 */
export function readOrganizationIssueTrackerConfig(
  settingsRoot: unknown
): OrganizationIssueTrackerConfig | null {
  const settings = parseIssueTrackerSettings(extractIssueTrackerSettingsJson(settingsRoot));
  if (!settings.provider) {
    return null;
  }
  const apiUrl =
    settings.apiUrl?.trim() ||
    (settings.provider === 'tracker' ? YANDEX_TRACKER_DEFAULT_API_URL : '');
  if (!apiUrl) {
    return null;
  }
  return { apiUrl, kind: settings.provider };
}

/** Публичные параметры трекера для UI (ссылки на задачи, выбор формы входа). */
export interface OrganizationIssueTrackerPublicDto {
  apiUrl: string;
  kind: IssueTrackerProviderKind;
  webBaseUrl: string;
}

export function organizationIssueTrackerPublicDto(
  settingsRoot: unknown
): OrganizationIssueTrackerPublicDto | null {
  const config = readOrganizationIssueTrackerConfig(settingsRoot);
  if (!config) {
    return null;
  }
  return {
    apiUrl: config.apiUrl,
    kind: config.kind,
    webBaseUrl: issueTrackerWebBaseFromApiUrl(config.kind, config.apiUrl),
  };
}

export function readIssueTrackerCloudId(settingsRoot: unknown): string {
  return cleanTrackerCloudId(
    parseIssueTrackerSettings(extractIssueTrackerSettingsJson(settingsRoot)).cloudId
  );
}

export function readIssueTrackerBasicAuthEmail(settingsRoot: unknown): string {
  return cleanJiraBasicAuthEmail(
    parseIssueTrackerSettings(extractIssueTrackerSettingsJson(settingsRoot)).basicAuthEmail
  );
}

export function mergeOrganizationSettingsIssueTrackerPatch(
  settingsRoot: unknown,
  patch: Partial<IssueTrackerSettings>
): Record<string, unknown> {
  const root =
    settingsRoot !== null && typeof settingsRoot === 'object' && !Array.isArray(settingsRoot)
      ? { ...(settingsRoot as Record<string, unknown>) }
      : {};
  const current = parseIssueTrackerSettings(extractIssueTrackerSettingsJson(root));
  const next = parseIssueTrackerSettings({ ...current, ...patch });
  root.issueTracker = next;
  return root;
}
