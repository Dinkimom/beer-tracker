/**
 * Секрет трекера организации для серверных вызовов (админка, sync-worker, аватары).
 * Jira Cloud OAuth: access token обновляется по ротируемому refresh token Atlassian.
 */

import { assertAtlassianOAuthConfigured } from '@/lib/atlassianOAuth/env';
import { jiraCloudOAuthApiBaseUrl } from '@/lib/atlassianOAuth/jiraCloudApiUrl';
import {
  parseOrgAtlassianOAuthSecret,
  parseOrgTrackerSecretPayload,
  serializeOrgAtlassianOAuthSecret,
  type OrgAtlassianOAuthSecret,
} from '@/lib/atlassianOAuth/orgSecretPayload';
import { refreshAtlassianAccessToken } from '@/lib/atlassianOAuth/tokenExchange';

import {
  getDecryptedOrganizationTrackerSecretRaw,
  updateOrganizationTrackerSecretLocked,
} from './organizationSecretsRepository';

const REFRESH_SKEW_MS = 60_000;

export interface OrganizationTrackerCredentials {
  accessToken: string;
  /** Jira Cloud OAuth 3LO: Bearer через api.atlassian.com/ex/jira/{cloudId}, а не Basic на URL сайта. */
  atlassianOAuth: boolean;
}

function isAccessTokenFresh(secret: OrgAtlassianOAuthSecret): boolean {
  return secret.expiresAt != null && Date.now() < secret.expiresAt - REFRESH_SKEW_MS;
}

async function rotateAtlassianSecret(
  secret: OrgAtlassianOAuthSecret
): Promise<OrgAtlassianOAuthSecret> {
  const configured = assertAtlassianOAuthConfigured();
  if (!configured.ok) {
    throw new Error(configured.error);
  }
  const tokens = await refreshAtlassianAccessToken({
    clientId: configured.clientId,
    clientSecret: configured.clientSecret,
    refreshToken: secret.refreshToken,
  });
  return {
    accessToken: tokens.accessToken,
    expiresAt: Date.now() + tokens.expiresIn * 1000,
    previousRefreshToken: secret.refreshToken,
    refreshToken: tokens.refreshToken,
  };
}

function rotatedSecretUpdate(secret: OrgAtlassianOAuthSecret) {
  return rotateAtlassianSecret(secret).then((rotated) => ({
    next: serializeOrgAtlassianOAuthSecret(rotated),
    result: rotated,
  }));
}

/** Под блокировкой строки: другой процесс мог уже обновить пару, пока мы ждали. */
function refreshStaleOrganizationSecret(
  organizationId: string
): Promise<OrgAtlassianOAuthSecret | null> {
  return updateOrganizationTrackerSecretLocked(organizationId, (raw) => {
    const secret = parseOrgAtlassianOAuthSecret(raw);
    if (!secret || isAccessTokenFresh(secret)) {
      return Promise.resolve({ next: null, result: secret });
    }
    return rotatedSecretUpdate(secret);
  });
}

/**
 * Токен трекера организации. Для OAuth-пары Jira Cloud при истечении access token
 * обновляет пару и сохраняет новый refresh token; при ошибке обновления отдаёт старый access
 * (апстрим ответит 401, причина — в логе).
 */
export async function getOrganizationTrackerCredentials(
  organizationId: string
): Promise<OrganizationTrackerCredentials | null> {
  const raw = await getDecryptedOrganizationTrackerSecretRaw(organizationId);
  if (!raw) {
    return null;
  }
  const secret = parseOrgAtlassianOAuthSecret(raw);
  if (!secret) {
    const accessToken = parseOrgTrackerSecretPayload(raw).accessToken;
    return accessToken ? { accessToken, atlassianOAuth: false } : null;
  }
  if (isAccessTokenFresh(secret)) {
    return { accessToken: secret.accessToken, atlassianOAuth: true };
  }
  try {
    const refreshed = await refreshStaleOrganizationSecret(organizationId);
    return { accessToken: (refreshed ?? secret).accessToken, atlassianOAuth: true };
  } catch (e) {
    console.error('[organization tracker oauth] refresh failed', {
      error: e instanceof Error ? e.message : String(e),
      organizationId,
    });
    return { accessToken: secret.accessToken, atlassianOAuth: true };
  }
}

/** URL API и email для клиента трекера с секретом организации. */
export function organizationTrackerClientAuth(input: {
  apiUrl: string;
  cloudId: string;
  credentials: OrganizationTrackerCredentials;
  jiraEmail: string;
}): { apiUrl: string; jiraEmail: string } {
  const cloudId = input.cloudId.trim();
  if (input.credentials.atlassianOAuth && cloudId) {
    return { apiUrl: jiraCloudOAuthApiBaseUrl(cloudId), jiraEmail: '' };
  }
  return { apiUrl: input.apiUrl, jiraEmail: input.jiraEmail };
}

function isSameGrant(secret: OrgAtlassianOAuthSecret, refreshToken: string): boolean {
  return secret.refreshToken === refreshToken || secret.previousRefreshToken === refreshToken;
}

async function readOrganizationOAuthSecretQuietly(
  organizationId: string
): Promise<OrgAtlassianOAuthSecret | null> {
  try {
    const raw = await getDecryptedOrganizationTrackerSecretRaw(organizationId);
    return raw ? parseOrgAtlassianOAuthSecret(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Refresh из браузера для гранта, который хранится и в организации (on-prem регистрация).
 * Браузер со старым refresh token получает текущую пару из БД, а не второй обмен, иначе
 * ротация Atlassian отключит токен у сервера или у браузера.
 * `null` — refresh token не относится к секрету организации.
 */
export async function refreshOrganizationSharedAtlassianGrant(
  organizationId: string,
  refreshToken: string
): Promise<OrgAtlassianOAuthSecret | null> {
  const token = refreshToken.trim();
  const snapshot = await readOrganizationOAuthSecretQuietly(organizationId);
  if (!token || !snapshot || !isSameGrant(snapshot, token)) {
    return null;
  }
  return updateOrganizationTrackerSecretLocked(organizationId, (raw) => {
    const secret = parseOrgAtlassianOAuthSecret(raw);
    if (!secret || !isSameGrant(secret, token)) {
      return Promise.resolve({ next: null, result: null });
    }
    if (secret.refreshToken !== token && isAccessTokenFresh(secret)) {
      return Promise.resolve({ next: null, result: secret });
    }
    return rotatedSecretUpdate(secret);
  });
}
