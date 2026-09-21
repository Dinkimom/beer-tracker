import { YANDEX_OAUTH_CLIENT_ID } from '@/constants';

import {
  JIRA_EXTERNAL_ORG_ID_FALLBACK,
  isJiraProviderKind,
  issueTrackerProviderI18nSuffix,
  type IssueTrackerProviderKind,
} from './types';

/** Jira Cloud API tokens are created in the Atlassian account, not on the Jira site. */
export const JIRA_CLOUD_API_TOKEN_HELP_URL =
  'https://id.atlassian.com/manage-profile/security/api-tokens';

const JIRA_PROFILE_TOKEN_PATH = '/secure/ViewProfile.jspa';
const JIRA_REST_API_PATH = /\/rest\/api\/\d+\/?$/i;
const YANDEX_TRACKER_WEB_ORIGIN = 'https://tracker.yandex.ru';

/** Cloud/API hosts whose browser UI lives on a different origin than TRACKER_API_URL. */
const YANDEX_API_HOST_TO_WEB_ORIGIN: Readonly<Record<string, string>> = {
  'api.tracker.yandex.net': YANDEX_TRACKER_WEB_ORIGIN,
  'st-api.yandex-team.ru': 'https://st.yandex-team.ru',
  'tracker.yandex.net': YANDEX_TRACKER_WEB_ORIGIN,
};

export interface TrackerWebUrlContext {
  kind: IssueTrackerProviderKind;
  webBaseUrl: string;
}

export interface IssueTrackerProviderCapabilities {
  supportsChecklists: boolean;
  supportsFieldCatalog: boolean;
  supportsIssueChildren: boolean;
  supportsQueryLanguageSearch: boolean;
  supportsRelatedIssues: boolean;
  supportsScreenCatalog: boolean;
  supportsSlaBugs: boolean;
}

export function issueTrackerProviderCapabilities(
  kind: IssueTrackerProviderKind
): IssueTrackerProviderCapabilities {
  const yandexShaped = !isJiraProviderKind(kind);
  return {
    supportsChecklists: yandexShaped,
    supportsFieldCatalog: yandexShaped,
    supportsIssueChildren: yandexShaped,
    supportsQueryLanguageSearch: yandexShaped,
    supportsRelatedIssues: yandexShaped,
    supportsScreenCatalog: yandexShaped,
    supportsSlaBugs: yandexShaped,
  };
}

const KIND_SPECIFIC_I18N_BASES = new Set([
  'auth.setup.infoMessage',
  'productAuth.register.onboardingTagline',
]);

export function issueTrackerProviderMessageKey(
  baseKey: string,
  kind: IssueTrackerProviderKind
): string {
  const suffix = KIND_SPECIFIC_I18N_BASES.has(baseKey)
    ? kind
    : issueTrackerProviderI18nSuffix(kind);
  return `${baseKey}.${suffix}`;
}

export function translateIssueTrackerProviderMessage(
  t: (key: string) => string,
  kind: IssueTrackerProviderKind,
  baseKey: string
): string {
  return t(issueTrackerProviderMessageKey(baseKey, kind));
}

/** Declension-aware product names for the connected issue tracker. */
interface IssueTrackerI18nParams {
  tracker: string;
  trackerDative: string;
  trackerGenitive: string;
  trackerInstrumental: string;
  trackerPrepositional: string;
}

export function issueTrackerI18nParams(
  t: (key: string) => string,
  kind: IssueTrackerProviderKind
): IssueTrackerI18nParams {
  return {
    tracker: translateIssueTrackerProviderMessage(t, kind, 'common.issueTracker.name'),
    trackerDative: translateIssueTrackerProviderMessage(t, kind, 'common.issueTracker.nameDative'),
    trackerGenitive: translateIssueTrackerProviderMessage(
      t,
      kind,
      'common.issueTracker.nameGenitive'
    ),
    trackerInstrumental: translateIssueTrackerProviderMessage(
      t,
      kind,
      'common.issueTracker.nameInstrumental'
    ),
    trackerPrepositional: translateIssueTrackerProviderMessage(
      t,
      kind,
      'common.issueTracker.namePrepositional'
    ),
  };
}

/** Yandex Tracker needs Cloud Org ID; Jira Server/DC does not. */
export function issueTrackerRequiresExternalOrgId(kind: IssueTrackerProviderKind): boolean {
  return kind === 'tracker';
}

export function resolveIssueTrackerExternalOrgIdForConnect(
  kind: IssueTrackerProviderKind,
  value: string
): string {
  const trimmed = value.trim();
  if (trimmed) {
    return trimmed;
  }
  return isJiraProviderKind(kind) ? JIRA_EXTERNAL_ORG_ID_FALLBACK : '';
}

export function jiraSiteOriginFromTrackerApiUrl(trackerApiUrl: string | undefined): string | null {
  return trackerApiUrlOrigin(trackerApiUrl);
}

/** Jira site base including context path (`/jira`), with `/rest/api/N` stripped. */
export function jiraSiteBaseFromTrackerApiUrl(trackerApiUrl: string | undefined): string | null {
  const raw = trackerApiUrl?.trim();
  if (!raw) {
    return null;
  }
  try {
    const url = new URL(raw);
    const path = url.pathname.replace(/\/$/, '').replace(JIRA_REST_API_PATH, '');
    return `${url.origin}${path}`;
  } catch {
    return null;
  }
}

/**
 * Browser origin/base for issue links. TRACKER_API_URL is the REST root, not the UI:
 * Jira — site base of that URL (`/browse/{key}`); Yandex Cloud — tracker.yandex.ru.
 */
export function issueTrackerWebBaseFromApiUrl(
  kind: IssueTrackerProviderKind,
  trackerApiUrl?: string
): string {
  if (isJiraProviderKind(kind)) {
    return jiraSiteBaseFromTrackerApiUrl(trackerApiUrl) ?? '';
  }
  return yandexTrackerWebBaseFromApiUrl(trackerApiUrl);
}

export function issueTrackerIssueWebUrlFromBase(
  kind: IssueTrackerProviderKind,
  webBaseUrl: string,
  issueKey: string
): string {
  const key = issueKey.trim();
  if (!key) {
    return '';
  }
  const path = isJiraProviderKind(kind)
    ? `browse/${encodeURIComponent(key)}`
    : encodeURIComponent(key);
  return joinTrackerWebPath(webBaseUrl, path);
}

export function issueTrackerQueueWebUrlFromBase(
  kind: IssueTrackerProviderKind,
  webBaseUrl: string,
  queueKey: string
): string {
  const key = queueKey.trim();
  if (!key) {
    return '';
  }
  const encoded = encodeURIComponent(key);
  const path = isJiraProviderKind(kind) ? `projects/${encoded}` : encoded;
  return joinTrackerWebPath(webBaseUrl, path);
}

export function issueTrackerIssueWebUrl(
  kind: IssueTrackerProviderKind,
  issueKey: string,
  trackerApiUrl?: string
): string {
  return issueTrackerIssueWebUrlFromBase(
    kind,
    issueTrackerWebBaseFromApiUrl(kind, trackerApiUrl),
    issueKey
  );
}

export function isHttpUrlOnTrackerWebBase(url: string, webBaseUrl: string): boolean {
  if (!/^https?:\/\//i.test(url) || !webBaseUrl.trim()) {
    return false;
  }
  try {
    return new URL(url).origin === new URL(webBaseUrl).origin;
  } catch {
    return false;
  }
}

export function issueTrackerTokenHelpUrl(
  kind: IssueTrackerProviderKind,
  trackerApiUrl?: string
): string {
  if (kind === 'jira-cloud') {
    return JIRA_CLOUD_API_TOKEN_HELP_URL;
  }
  if (kind === 'jira-onprem') {
    const base = jiraSiteBaseFromTrackerApiUrl(trackerApiUrl);
    return base ? `${base}${JIRA_PROFILE_TOKEN_PATH}` : '';
  }
  return `https://oauth.yandex.ru/authorize?response_type=token&client_id=${YANDEX_OAUTH_CLIENT_ID}&scope=tracker:read+tracker:write`;
}

function trackerApiUrlOrigin(trackerApiUrl: string | undefined): string | null {
  const raw = trackerApiUrl?.trim();
  if (!raw) {
    return null;
  }
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

function yandexTrackerWebBaseFromApiUrl(trackerApiUrl?: string): string {
  const origin = trackerApiUrlOrigin(trackerApiUrl);
  if (!origin) {
    return YANDEX_TRACKER_WEB_ORIGIN;
  }
  const host = new URL(origin).hostname.toLowerCase();
  const mapped = YANDEX_API_HOST_TO_WEB_ORIGIN[host];
  if (mapped) {
    return mapped;
  }
  if (!host.startsWith('st-api.')) {
    return origin;
  }
  const url = new URL(origin);
  return `${url.protocol}//st.${host.slice('st-api.'.length)}`;
}

function joinTrackerWebPath(webBaseUrl: string, path: string): string {
  const base = webBaseUrl.replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path.slice(1) : path;
  if (!base) {
    return `/${suffix}`;
  }
  return `${base}/${suffix}`;
}
