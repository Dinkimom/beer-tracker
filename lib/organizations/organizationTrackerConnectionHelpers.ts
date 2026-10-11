import type { VerifyOrganizationTrackerTokenOptions, VerifyStoredTrackerTokenResult } from './organizationTrackerConnection';
import type { OrganizationIssueTrackerConfig } from '@/lib/issueTrackerProvider/settings';
import type { IssueTrackerProviderKind } from '@/lib/issueTrackerProvider/types';
import type { OrganizationRow } from '@/lib/organizations/types';

import { encryptOrgTrackerToken } from '@/lib/crypto-org-secrets';
import { getOrgSecretsMasterKey } from '@/lib/env';
import { resolveIssueTrackerExternalOrgIdForConnect } from '@/lib/issueTrackerProvider/issueTrackerUi';
import {
  cleanJiraBasicAuthEmail,
  JIRA_CLOUD_BASIC_AUTH_EMAIL_REQUIRED_MESSAGE,
  jiraCloudRequiresBasicAuthEmail,
  resolveJiraBasicAuthEmail,
} from '@/lib/issueTrackerProvider/jiraBasicAuthEmail';
import {
  readIssueTrackerBasicAuthEmail,
  readIssueTrackerCloudId,
  readOrganizationIssueTrackerConfig,
  YANDEX_TRACKER_DEFAULT_API_URL,
} from '@/lib/issueTrackerProvider/settings';
import { readIssueTrackerExternalOrgId } from '@/lib/issueTrackerProvider/storageAliases';
import { enqueueInitialFullSync } from '@/lib/sync/queue';
import { isSyncRedisConfigured } from '@/lib/sync/redisConnection';
import {
  cleanOrganizationTrackerToken,
  normalizeTrackerApiBaseUrl,
  validateIssueTrackerCredentials,
} from '@/lib/trackerCredentialsValidation';

import { findOrganizationById } from './organizationRepository';
import {
  getDecryptedOrganizationTrackerSecretRaw,
  getDecryptedOrganizationTrackerToken,
} from './organizationSecretsRepository';

interface ConnectionError { error: string; ok: false; status: number }

/** Трекер из формы админки; не передан — сохранённый в организации. */
export function resolveIssueTrackerForConnection(
  org: Pick<OrganizationRow, 'initial_sync_completed_at' | 'settings'>,
  input: { provider?: IssueTrackerProviderKind; trackerApiBaseUrl?: string | null }
): ConnectionError | { config: OrganizationIssueTrackerConfig; ok: true } {
  const stored = readOrganizationIssueTrackerConfig(org.settings);
  const kind = input.provider ?? stored?.kind;
  if (!kind) {
    return { error: 'Выберите трекер задач', ok: false, status: 400 };
  }
  if (stored && org.initial_sync_completed_at && kind !== stored.kind) {
    return {
      error: 'Трекер нельзя сменить после первой синхронизации: данные привязаны к его идентификаторам',
      ok: false,
      status: 409,
    };
  }
  const fromInput = input.trackerApiBaseUrl?.trim() ?? '';
  const fromStored = stored?.kind === kind ? stored.apiUrl : '';
  const rawUrl = fromInput || fromStored || (kind === 'tracker' ? YANDEX_TRACKER_DEFAULT_API_URL : '');
  if (!rawUrl) {
    return { error: 'Укажите URL API трекера', ok: false, status: 400 };
  }
  try {
    return { config: { apiUrl: normalizeTrackerApiBaseUrl(rawUrl), kind }, ok: true };
  } catch {
    return { error: 'Некорректный URL API трекера', ok: false, status: 400 };
  }
}

export function resolveTrackerOrgIdForVerify(
  org: { tracker_org_id: string },
  kind: IssueTrackerProviderKind,
  options?: VerifyOrganizationTrackerTokenOptions
): string | null {
  const fromFormOrg = options?.trackerOrgId?.trim();
  if (fromFormOrg && fromFormOrg !== '') {
    return fromFormOrg;
  }
  const stored = readIssueTrackerExternalOrgId(org);
  if (stored) {
    return stored;
  }
  const fallback = resolveIssueTrackerExternalOrgIdForConnect(kind, '');
  return fallback || null;
}

export function resolveTrackerOrgIdForConnect(
  kind: IssueTrackerProviderKind,
  rawOrgId: string
): string {
  return resolveIssueTrackerExternalOrgIdForConnect(kind, rawOrgId);
}

async function loadStoredOAuthTokenForVerify(
  organizationId: string
): Promise<VerifyStoredTrackerTokenResult | { ok: true; token: string }> {
  try {
    const t = await getDecryptedOrganizationTrackerToken(organizationId);
    if (!t?.trim()) {
      return {
        error:
          'Введите OAuth-токен в поле и нажмите «Проверить», либо сначала сохраните настройки',
        ok: false,
        status: 400,
      };
    }
    return { ok: true, token: t.replace(/\s+/g, '').trim() };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : 'Не удалось прочитать сохранённый токен',
      ok: false,
      status: 500,
    };
  }
}

export function resolveOAuthTokenForVerify(
  organizationId: string,
  options?: VerifyOrganizationTrackerTokenOptions
): Promise<VerifyStoredTrackerTokenResult | { ok: true; token: string }> {
  const draftToken =
    options?.oauthToken != null ? cleanOrganizationTrackerToken(options.oauthToken) : '';

  if (draftToken) {
    return Promise.resolve({ ok: true, token: draftToken });
  }

  return loadStoredOAuthTokenForVerify(organizationId);
}

export function resolveTrackerConnectionCloudId(input: {
  cloudId?: string;
  settingsRoot: unknown;
}): string {
  const fromInput = input.cloudId?.trim() ?? '';
  if (fromInput) {
    return fromInput;
  }
  return readIssueTrackerCloudId(input.settingsRoot);
}

export function resolveTrackerConnectionEmail(input: {
  jiraEmail?: string;
  oauthToken?: string;
  settingsRoot: unknown;
}): string {
  const usingRequestToken = Boolean(cleanOrganizationTrackerToken(input.oauthToken ?? ''));
  const storedOrgEmail = readIssueTrackerBasicAuthEmail(input.settingsRoot);
  const primary = resolveJiraBasicAuthEmail({
    requestEmail: input.jiraEmail,
    storedOrgEmail,
    usingRequestToken,
  });
  if (primary) {
    return primary;
  }
  return usingRequestToken ? storedOrgEmail : cleanJiraBasicAuthEmail(input.jiraEmail);
}

export async function validateTrackerOAuthOrError(input: {
  apiUrl: string;
  email?: string;
  oauthToken: string;
  orgId: string;
  providerKind: IssueTrackerProviderKind;
}): Promise<VerifyStoredTrackerTokenResult | { ok: true }> {
  if (jiraCloudRequiresBasicAuthEmail(input.providerKind) && !input.email?.trim()) {
    return {
      error: JIRA_CLOUD_BASIC_AUTH_EMAIL_REQUIRED_MESSAGE,
      ok: false,
      status: 400,
    };
  }
  const validated = await validateIssueTrackerCredentials({
    apiUrl: input.apiUrl,
    email: input.email,
    oauthToken: cleanOrganizationTrackerToken(input.oauthToken),
    orgId: input.orgId,
    providerKind: input.providerKind,
  });
  if (!validated.ok) {
    return { error: validated.message, ok: false, status: validated.status ?? 400 };
  }
  return { ok: true };
}

export async function resolveOAuthTokenForConnect(
  orgId: string,
  tokenFromInput: string
): Promise<{ error: string; ok: false; status: number } | { ok: true; cleanedToken: string }> {
  if (tokenFromInput) {
    return { ok: true, cleanedToken: tokenFromInput };
  }

  let stored: string | null;
  try {
    stored =
      (await getDecryptedOrganizationTrackerSecretRaw(orgId)) ??
      (await getDecryptedOrganizationTrackerToken(orgId));
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Не удалось прочитать сохранённый токен';
    return { error: msg, ok: false, status: 500 };
  }
  const s = stored?.trim() ?? '';
  if (!s) {
    return {
      error: 'Укажите OAuth-токен при первом подключении или смените токен',
      ok: false,
      status: 400,
    };
  }
  return { ok: true, cleanedToken: s };
}

export function encryptTrackerTokenOrError(
  cleanedToken: string
): { encrypted: Buffer; ok: true } | { error: string; ok: false; status: number } {
  try {
    const key = getOrgSecretsMasterKey();
    return { ok: true, encrypted: encryptOrgTrackerToken(cleanedToken, key) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Ошибка шифрования токена';
    return { error: msg, ok: false, status: 500 };
  }
}

export async function enqueueInitialSyncJob(
  organizationId: string,
  userId: string
): Promise<{ syncJobEnqueued: boolean; syncJobWarning?: string }> {
  if (!isSyncRedisConfigured()) {
    return {
      syncJobEnqueued: false,
      syncJobWarning: 'Redis не настроен (REDIS_URL); первичную синхронизацию нужно запустить вручную',
    };
  }
  try {
    await enqueueInitialFullSync(organizationId, userId);
    return { syncJobEnqueued: true };
  } catch (e) {
    return {
      syncJobEnqueued: false,
      syncJobWarning: e instanceof Error ? e.message : 'Не удалось поставить initial_full в очередь',
    };
  }
}

export async function findOrganizationOrNotFound(
  organizationId: string
): Promise<{ error: string; ok: false; status: number } | { ok: true; org: NonNullable<Awaited<ReturnType<typeof findOrganizationById>>> }> {
  const org = await findOrganizationById(organizationId);
  if (!org) {
    return { error: 'Организация не найдена', ok: false, status: 404 };
  }
  return { ok: true, org };
}
