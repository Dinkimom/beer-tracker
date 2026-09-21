/**
 * Сохранение параметров трекера и серверного токена (транзакция) + постановка initial_full.
 */

import type { OrganizationTrackerAdminFormState } from './organizationTrackerAdminFormState';
import type { QueryParams } from '@/types';

import { pool, qualifyBeerTrackerTables } from '@/lib/db';
import { readIssueTrackerExternalOrgId } from '@/lib/issueTrackerProvider/storageAliases';
import { cleanOrganizationTrackerToken } from '@/lib/trackerCredentialsValidation';

import { findOrganizationSecretRow } from './organizationSecretsRepository';
import {
  encryptTrackerTokenOrError,
  enqueueInitialSyncJob,
  findOrganizationOrNotFound,
  normalizeTrackerApiUrlOrError,
  resolveDefaultTrackerApiUrl,
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
  /** Email Atlassian для Jira Cloud Basic; иначе из настроек организации. */
  jiraEmail?: string;
  /**
   * Пустая строка / не передан — берётся сохранённый в БД токен (если есть).
   * Новое значение перешифровывается и заменяет секрет.
   */
  oauthToken?: string;
  organizationId: string;
  /** Если не задан — берётся из TRACKER_API_URL. */
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

async function persistTrackerConnection(params: {
  encryptedToken: Buffer;
  organizationId: string;
  trackerOrgId: string;
}): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const run = async (text: string, values?: QueryParams) => {
      await client.query(qualifyBeerTrackerTables(text), values);
    };
    await run(
      `UPDATE organizations
       SET tracker_org_id = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [params.organizationId, params.trackerOrgId]
    );
    await run(
      `INSERT INTO organization_secrets (organization_id, encrypted_tracker_token, encryption_key_version)
       VALUES ($1, $2, 1)
       ON CONFLICT (organization_id) DO UPDATE
       SET encrypted_tracker_token = EXCLUDED.encrypted_tracker_token,
           encryption_key_version = 1,
           updated_at = CURRENT_TIMESTAMP`,
      [params.organizationId, params.encryptedToken]
    );
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

async function persistTrackerOrgFieldsOnly(params: {
  organizationId: string;
  trackerOrgId: string;
}): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const run = async (text: string, values?: QueryParams) => {
      await client.query(qualifyBeerTrackerTables(text), values);
    };
    await run(
      `UPDATE organizations
       SET tracker_org_id = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [params.organizationId, params.trackerOrgId]
    );
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
 * Поля формы админки (без секретов): UUID org в продукте, Cloud Org ID трекера, факт наличия шифрованного токена.
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
  return {
    hasStoredToken,
    organizationId: org.org.id,
    trackerOrgId: readIssueTrackerExternalOrgId(org.org),
  };
}

export interface VerifyOrganizationTrackerTokenOptions {
  /** Email Atlassian (Jira Cloud Basic); иначе из настроек организации. */
  jiraEmail?: string;
  /** Токен из формы; если не передан или пустой — берётся сохранённый в БД. */
  oauthToken?: string;
  /** Cloud Organization ID из формы; если не передан или пустой — из БД. */
  trackerOrgId?: string;
}

/**
 * Проверка токена к API трекера без записи в БД.
 * Можно передать `oauthToken` и `trackerOrgId` из формы до нажатия «Сохранить».
 */
export async function verifyOrganizationTrackerTokenForAdmin(
  organizationId: string,
  options?: VerifyOrganizationTrackerTokenOptions
): Promise<VerifyStoredTrackerTokenResult> {
  const orgResult = await findOrganizationOrNotFound(organizationId);
  if (!orgResult.ok) {
    return orgResult;
  }

  const trackerOrgId = resolveTrackerOrgIdForVerify(orgResult.org, options);
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

  const urlResult = normalizeTrackerApiUrlOrError(resolveDefaultTrackerApiUrl());
  if (!urlResult.ok) {
    return urlResult;
  }

  return validateTrackerOAuthOrError({
    apiUrl: (urlResult as { ok: true; trackerApiBaseUrl: string }).trackerApiBaseUrl,
    email: resolveTrackerConnectionEmail({
      jiraEmail: options?.jiraEmail,
      oauthToken: options?.oauthToken,
      settingsRoot: orgResult.org.settings,
    }),
    oauthToken: (tokenResult as { ok: true; token: string }).token,
    orgId: trackerOrgId,
  });
}

/** Проверка только сохранённых в БД org id и токена (тело запроса не используется). */
export function verifyStoredOrganizationTrackerToken(
  organizationId: string
): Promise<VerifyStoredTrackerTokenResult> {
  return verifyOrganizationTrackerTokenForAdmin(organizationId);
}

/**
 * Валидирует токен в трекере, затем сохраняет URL/org id и при необходимости шифрованный токен.
 * Пустой `oauthToken` — используется ранее сохранённый токен (если org/url не менялись, БД не трогаем).
 * При изменении настроек или новом токене ставит initial_full в Redis (если настроен).
 */
async function persistConnectedTrackerCredentials(input: {
  organizationId: string;
  trackerOrgId: string;
  token: string;
  wroteNewToken: boolean;
}): Promise<ConnectOrganizationTrackerResult | { ok: true }> {
  try {
    if (input.wroteNewToken) {
      const encryptedResult = encryptTrackerTokenOrError(input.token);
      if (!encryptedResult.ok) {
        return encryptedResult;
      }
      await persistTrackerConnection({
        encryptedToken: encryptedResult.encrypted,
        organizationId: input.organizationId,
        trackerOrgId: input.trackerOrgId,
      });
      return { ok: true };
    }
    await persistTrackerOrgFieldsOnly({
      organizationId: input.organizationId,
      trackerOrgId: input.trackerOrgId,
    });
    return { ok: true };
  } catch (e) {
    console.error('[connectOrganizationTracker] persist failed', e);
    return { error: 'Не удалось сохранить настройки', ok: false, status: 500 };
  }
}

async function finalizeTrackerConnection(
  input: ConnectOrganizationTrackerInput,
  trackerOrgId: string,
  token: string,
  wroteNewToken: boolean
): Promise<ConnectOrganizationTrackerResult> {
  const persisted = await persistConnectedTrackerCredentials({
    organizationId: input.organizationId,
    trackerOrgId,
    token,
    wroteNewToken,
  });
  if (!persisted.ok) {
    return persisted;
  }
  const syncResult = await enqueueInitialSyncJob(input.organizationId, input.userId);
  return { ok: true, ...syncResult };
}

function resolveConnectTrackerApiUrl(
  trackerApiBaseUrl: string | null | undefined
): { error: string; ok: false; status: number } | { ok: true; trackerApiBaseUrl: string } {
  const rawUrl =
    trackerApiBaseUrl != null && String(trackerApiBaseUrl).trim() !== ''
      ? String(trackerApiBaseUrl).trim()
      : resolveDefaultTrackerApiUrl();
  const urlResult = normalizeTrackerApiUrlOrError(rawUrl);
  if (!urlResult.ok) {
    return urlResult;
  }
  if ('trackerApiBaseUrl' in urlResult) {
    return urlResult;
  }
  return { error: 'Некорректный URL API трекера', ok: false, status: 400 };
}

function unchangedTrackerConnectResult(
  org: { tracker_org_id: string },
  trackerOrgId: string,
  oauthToken?: string
): ConnectOrganizationTrackerResult | null {
  const prevOrgId = readIssueTrackerExternalOrgId(org);
  const wroteNewToken = Boolean(cleanOrganizationTrackerToken(oauthToken ?? ''));
  if (prevOrgId === trackerOrgId && !wroteNewToken) {
    return { ok: true, syncJobEnqueued: false, unchanged: true };
  }
  return null;
}

async function resolveAndValidateTrackerOAuth(
  organizationId: string,
  oauthToken: string | undefined,
  trackerOrgId: string,
  trackerApiBaseUrl: string,
  settingsRoot: unknown,
  jiraEmail?: string
): Promise<ConnectOrganizationTrackerResult | { cleanedToken: string }> {
  const tokenFromInput = cleanOrganizationTrackerToken(oauthToken ?? '');
  const tokenResult = await resolveOAuthTokenForConnect(organizationId, tokenFromInput);
  if (!tokenResult.ok) {
    return tokenResult;
  }
  const validated = await validateTrackerOAuthOrError({
    apiUrl: trackerApiBaseUrl,
    email: resolveTrackerConnectionEmail({
      jiraEmail,
      oauthToken,
      settingsRoot,
    }),
    oauthToken: tokenResult.cleanedToken,
    orgId: trackerOrgId,
  });
  if (!validated.ok) {
    return validated;
  }
  return { cleanedToken: tokenResult.cleanedToken };
}

export async function connectOrganizationTracker(
  input: ConnectOrganizationTrackerInput
): Promise<ConnectOrganizationTrackerResult> {
  const orgResult = await findOrganizationOrNotFound(input.organizationId);
  if (!orgResult.ok) {
    return orgResult;
  }

  const urlResult = resolveConnectTrackerApiUrl(input.trackerApiBaseUrl);
  if (!urlResult.ok) {
    return urlResult;
  }

  const trackerOrgId = resolveTrackerOrgIdForConnect(input.trackerOrgId);
  if (!trackerOrgId) {
    return { error: 'Укажите идентификатор организации в трекере', ok: false, status: 400 };
  }

  const unchanged = unchangedTrackerConnectResult(orgResult.org, trackerOrgId, input.oauthToken);
  if (unchanged) {
    return unchanged;
  }

  const wroteNewToken = Boolean(cleanOrganizationTrackerToken(input.oauthToken ?? ''));
  const authResult = await resolveAndValidateTrackerOAuth(
    orgResult.org.id,
    input.oauthToken,
    trackerOrgId,
    urlResult.trackerApiBaseUrl,
    orgResult.org.settings,
    input.jiraEmail
  );
  if (!('cleanedToken' in authResult)) {
    return authResult;
  }

  return finalizeTrackerConnection(input, trackerOrgId, authResult.cleanedToken, wroteNewToken);
}
