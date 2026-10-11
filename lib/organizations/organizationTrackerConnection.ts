/**
 * Сохранение параметров трекера и серверного токена (транзакция) + постановка initial_full.
 */

import type { OrganizationTrackerAdminFormState } from './organizationTrackerAdminFormState';
import type { OrganizationIssueTrackerConfig } from '@/lib/issueTrackerProvider/settings';
import type { IssueTrackerProviderKind } from '@/lib/issueTrackerProvider/types';
import type { QueryParams } from '@/types';

import { pool, qualifyBeerTrackerTables } from '@/lib/db';
import {
  mergeOrganizationSettingsIssueTrackerPatch,
  readIssueTrackerBasicAuthEmail,
  readOrganizationIssueTrackerConfig,
} from '@/lib/issueTrackerProvider/settings';
import { readIssueTrackerExternalOrgId } from '@/lib/issueTrackerProvider/storageAliases';
import { cleanOrganizationTrackerToken } from '@/lib/trackerCredentialsValidation';

import { findOrganizationSecretRow } from './organizationSecretsRepository';
import {
  encryptTrackerTokenOrError,
  enqueueInitialSyncJob,
  findOrganizationOrNotFound,
  resolveIssueTrackerForConnection,
  resolveOAuthTokenForConnect,
  resolveOAuthTokenForVerify,
  resolveTrackerConnectionEmail,
  resolveTrackerOrgIdForConnect,
  resolveTrackerOrgIdForVerify,
  validateTrackerOAuthOrError,
} from './organizationTrackerConnectionHelpers';

export type VerifyStoredTrackerTokenResult =
  { error: string; ok: false; status: number } | { ok: true };

interface ConnectOrganizationTrackerInput {
  /** Email Atlassian-аккаунта для org API-токена (Jira Cloud Basic). */
  jiraEmail?: string;
  /**
   * Пустая строка / не передан — берётся сохранённый в БД токен (если есть).
   * Новое значение перешифровывается и заменяет секрет.
   */
  oauthToken?: string;
  organizationId: string;
  /** Не передан — сохранённый трекер организации. */
  provider?: IssueTrackerProviderKind;
  /** Не передан — сохранённый URL (для Яндекс Трекера — публичный API). */
  trackerApiBaseUrl?: string | null;
  trackerOrgId: string;
  userId: string;
}

type ConnectOrganizationTrackerResult =
  | {
      ok: true;
      syncJobEnqueued: boolean;
      syncJobWarning?: string;
      /** Ни поля, ни токен не менялись — запрос в трекер не нужен. */
      unchanged?: boolean;
    }
  | { error: string; ok: false; status: number };

interface PersistTrackerConnectionParams {
  /** `null` — токен не менялся. */
  encryptedToken: Buffer | null;
  issueTracker: OrganizationIssueTrackerConfig;
  jiraEmail?: string;
  organizationId: string;
  settingsRoot: unknown;
  trackerOrgId: string;
}

function nextOrganizationSettings(params: PersistTrackerConnectionParams): Record<string, unknown> {
  const email = params.jiraEmail?.trim() ?? '';
  return mergeOrganizationSettingsIssueTrackerPatch(params.settingsRoot, {
    apiUrl: params.issueTracker.apiUrl,
    provider: params.issueTracker.kind,
    ...(email ? { basicAuthEmail: email } : {}),
  });
}

async function persistTrackerConnection(params: PersistTrackerConnectionParams): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const run = async (text: string, values?: QueryParams) => {
      await client.query(qualifyBeerTrackerTables(text), values);
    };
    await run(
      `UPDATE organizations
       SET tracker_org_id = $2,
           settings = $3::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [params.organizationId, params.trackerOrgId, JSON.stringify(nextOrganizationSettings(params))]
    );
    if (params.encryptedToken) {
      await run(
        `INSERT INTO organization_secrets (organization_id, encrypted_tracker_token, encryption_key_version)
         VALUES ($1, $2, 1)
         ON CONFLICT (organization_id) DO UPDATE
         SET encrypted_tracker_token = EXCLUDED.encrypted_tracker_token,
             encryption_key_version = 1,
             updated_at = CURRENT_TIMESTAMP`,
        [params.organizationId, params.encryptedToken]
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Поля формы админки (без секретов): трекер и URL API, Cloud Org ID, факт наличия шифрованного токена.
 */
export async function getOrganizationTrackerAdminFormState(
  organizationId: string
): Promise<OrganizationTrackerAdminFormState | null> {
  const org = await findOrganizationOrNotFound(organizationId);
  if (!org.ok) {
    return null;
  }
  const row = await findOrganizationSecretRow(organizationId);
  const buf = row?.encrypted_tracker_token;
  const hasStoredToken =
    buf != null && (Buffer.isBuffer(buf) ? buf.length > 0 : Buffer.byteLength(Buffer.from(buf)) > 0);
  const issueTracker = readOrganizationIssueTrackerConfig(org.org.settings);
  return {
    apiUrl: issueTracker?.apiUrl ?? '',
    hasStoredToken,
    jiraEmail: readIssueTrackerBasicAuthEmail(org.org.settings),
    organizationId: org.org.id,
    provider: issueTracker?.kind ?? null,
    providerLocked: Boolean(issueTracker && org.org.initial_sync_completed_at),
    trackerOrgId: readIssueTrackerExternalOrgId(org.org),
  };
}

export interface VerifyOrganizationTrackerTokenOptions {
  /** Email Atlassian-аккаунта для org API-токена (Jira Cloud Basic). */
  jiraEmail?: string;
  /** Токен из формы; если не передан или пустой — берётся сохранённый в БД. */
  oauthToken?: string;
  /** Трекер из формы; если не передан — сохранённый. */
  provider?: IssueTrackerProviderKind;
  /** URL API из формы; если не передан — сохранённый. */
  trackerApiBaseUrl?: string;
  /** Cloud Organization ID из формы; если не передан или пустой — из БД. */
  trackerOrgId?: string;
}

/**
 * Проверка токена к API трекера без записи в БД.
 * Можно передать трекер, URL, `oauthToken` и `trackerOrgId` из формы до нажатия «Сохранить».
 */
export async function verifyOrganizationTrackerTokenForAdmin(
  organizationId: string,
  options?: VerifyOrganizationTrackerTokenOptions
): Promise<VerifyStoredTrackerTokenResult> {
  const orgResult = await findOrganizationOrNotFound(organizationId);
  if (!orgResult.ok) {
    return orgResult;
  }

  const trackerResult = resolveIssueTrackerForConnection(orgResult.org, {
    provider: options?.provider,
    trackerApiBaseUrl: options?.trackerApiBaseUrl,
  });
  if (!trackerResult.ok) {
    return trackerResult;
  }
  const { config } = trackerResult;

  const trackerOrgId = resolveTrackerOrgIdForVerify(orgResult.org, config.kind, options);
  if (!trackerOrgId) {
    return {
      error: 'Укажите Cloud Organization ID в форме',
      ok: false,
      status: 400,
    };
  }

  const tokenResult = await resolveOAuthTokenForVerify(organizationId, options);
  if (!tokenResult.ok) {
    return tokenResult;
  }

  return validateTrackerOAuthOrError({
    apiUrl: config.apiUrl,
    email: resolveTrackerConnectionEmail({
      jiraEmail: options?.jiraEmail,
      oauthToken: options?.oauthToken,
      settingsRoot: orgResult.org.settings,
    }),
    oauthToken: (tokenResult as { ok: true; token: string }).token,
    orgId: trackerOrgId,
    providerKind: config.kind,
  });
}

/** Проверка только сохранённых в БД настроек и токена (тело запроса не используется). */
export function verifyStoredOrganizationTrackerToken(
  organizationId: string
): Promise<VerifyStoredTrackerTokenResult> {
  return verifyOrganizationTrackerTokenForAdmin(organizationId);
}

function unchangedTrackerConnectResult(
  org: { settings: unknown; tracker_org_id: string },
  issueTracker: OrganizationIssueTrackerConfig,
  trackerOrgId: string,
  oauthToken?: string,
  jiraEmail?: string
): ConnectOrganizationTrackerResult | null {
  const stored = readOrganizationIssueTrackerConfig(org.settings);
  const trackerUnchanged =
    stored?.kind === issueTracker.kind && stored.apiUrl === issueTracker.apiUrl;
  const prevOrgId = readIssueTrackerExternalOrgId(org);
  const wroteNewToken = Boolean(cleanOrganizationTrackerToken(oauthToken ?? ''));
  const email = jiraEmail?.trim() ?? '';
  const emailUnchanged =
    !email || email === readIssueTrackerBasicAuthEmail(org.settings);
  if (trackerUnchanged && prevOrgId === trackerOrgId && !wroteNewToken && emailUnchanged) {
    return { ok: true, syncJobEnqueued: false, unchanged: true };
  }
  return null;
}

async function resolveAndValidateTrackerOAuth(input: {
  issueTracker: OrganizationIssueTrackerConfig;
  jiraEmail?: string;
  oauthToken: string | undefined;
  organizationId: string;
  settingsRoot: unknown;
  trackerOrgId: string;
}): Promise<ConnectOrganizationTrackerResult | { cleanedToken: string; jiraEmail: string }> {
  const tokenFromInput = cleanOrganizationTrackerToken(input.oauthToken ?? '');
  const tokenResult = await resolveOAuthTokenForConnect(input.organizationId, tokenFromInput);
  if (!tokenResult.ok) {
    return tokenResult;
  }
  const resolvedEmail = resolveTrackerConnectionEmail({
    jiraEmail: input.jiraEmail,
    oauthToken: input.oauthToken,
    settingsRoot: input.settingsRoot,
  });
  const validated = await validateTrackerOAuthOrError({
    apiUrl: input.issueTracker.apiUrl,
    email: resolvedEmail,
    oauthToken: tokenResult.cleanedToken,
    orgId: input.trackerOrgId,
    providerKind: input.issueTracker.kind,
  });
  if (!validated.ok) {
    return validated;
  }
  return { cleanedToken: tokenResult.cleanedToken, jiraEmail: resolvedEmail };
}

async function persistConnectedTrackerCredentials(
  params: Omit<PersistTrackerConnectionParams, 'encryptedToken'> & {
    token: string;
    wroteNewToken: boolean;
  }
): Promise<ConnectOrganizationTrackerResult | { ok: true }> {
  let encryptedToken: Buffer | null = null;
  if (params.wroteNewToken) {
    const encryptedResult = encryptTrackerTokenOrError(params.token);
    if (!encryptedResult.ok) {
      return encryptedResult;
    }
    encryptedToken = encryptedResult.encrypted;
  }
  try {
    await persistTrackerConnection({ ...params, encryptedToken });
    return { ok: true };
  } catch (e) {
    console.error('[connectOrganizationTracker] persist failed', e);
    return { error: 'Не удалось сохранить настройки', ok: false, status: 500 };
  }
}

/**
 * Валидирует токен в трекере, затем сохраняет трекер, URL, org id и при необходимости шифрованный токен.
 * Пустой `oauthToken` — используется ранее сохранённый токен (если ничего не менялось, БД не трогаем).
 * При изменении настроек или новом токене ставит initial_full в Redis (если настроен).
 */
export async function connectOrganizationTracker(
  input: ConnectOrganizationTrackerInput
): Promise<ConnectOrganizationTrackerResult> {
  const orgResult = await findOrganizationOrNotFound(input.organizationId);
  if (!orgResult.ok) {
    return orgResult;
  }
  const { org } = orgResult;

  const trackerResult = resolveIssueTrackerForConnection(org, input);
  if (!trackerResult.ok) {
    return trackerResult;
  }
  const issueTracker = trackerResult.config;

  const trackerOrgId = resolveTrackerOrgIdForConnect(issueTracker.kind, input.trackerOrgId);
  if (!trackerOrgId) {
    return { error: 'Укажите идентификатор организации в трекере', ok: false, status: 400 };
  }

  const unchanged = unchangedTrackerConnectResult(
    org,
    issueTracker,
    trackerOrgId,
    input.oauthToken,
    input.jiraEmail
  );
  if (unchanged) {
    return unchanged;
  }

  const authResult = await resolveAndValidateTrackerOAuth({
    issueTracker,
    jiraEmail: input.jiraEmail,
    oauthToken: input.oauthToken,
    organizationId: org.id,
    settingsRoot: org.settings,
    trackerOrgId,
  });
  if (!('cleanedToken' in authResult)) {
    return authResult;
  }

  const persisted = await persistConnectedTrackerCredentials({
    issueTracker,
    jiraEmail: authResult.jiraEmail,
    organizationId: org.id,
    settingsRoot: org.settings,
    token: authResult.cleanedToken,
    trackerOrgId,
    wroteNewToken: Boolean(cleanOrganizationTrackerToken(input.oauthToken ?? '')),
  });
  if (!persisted.ok) {
    return persisted;
  }
  const syncResult = await enqueueInitialSyncJob(input.organizationId, input.userId);
  return { ok: true, ...syncResult };
}
