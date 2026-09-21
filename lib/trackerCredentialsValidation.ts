/**
 * Проверка токена трекера до сохранения в organization_secrets.
 */

import { getIssueTrackerProviderKind } from '@/lib/env';
import { createJiraAxiosInstance } from '@/lib/issueTrackerProvider/jiraAxios';
import { isJiraProviderKind } from '@/lib/issueTrackerProvider/types';
import { createTrackerAxiosInstance } from '@/lib/trackerAxiosFactory';

import {
  validateTrackerMyselfEndpoint,
  validateTrackerUsersAdminEndpoint,
} from './trackerCredentialsValidationHelpers';

export function cleanOrganizationTrackerToken(token: string): string {
  return token.replace(/\s+/g, '').trim();
}

/**
 * Нормализует базовый URL API (без завершающего слэша).
 */
export function normalizeTrackerApiBaseUrl(input: string): string {
  const raw = input.trim();
  const u = new URL(raw);
  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    throw new Error('Tracker API URL must use http or https');
  }
  let path = u.pathname;
  while (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  return path ? `${u.origin}${path}` : u.origin;
}

type ValidateTrackerCredentialsResult =
  { message: string; ok: false; status?: number } | { message?: string; ok: true };

/**
 * Проверка OAuth-токена: `GET /myself` и «администраторский» `GET /users`
 * (постраничный список пользователей организации в API v3).
 */
export async function validateYandexTrackerOAuth(params: {
  apiUrl: string;
  oauthToken: string;
  orgId: string;
}): Promise<ValidateTrackerCredentialsResult> {
  const token = cleanOrganizationTrackerToken(params.oauthToken);
  if (!token) {
    return { message: 'Токен пустой после нормализации', ok: false, status: 400 };
  }
  const orgId = params.orgId.trim();
  if (!orgId) {
    return { message: 'Укажите идентификатор организации в трекере', ok: false, status: 400 };
  }

  let apiUrl: string;
  try {
    apiUrl = normalizeTrackerApiBaseUrl(params.apiUrl);
  } catch {
    return { message: 'Некорректный URL API трекера', ok: false, status: 400 };
  }

  const api = createTrackerAxiosInstance({
    apiUrl,
    oauthToken: token,
    orgId,
  });

  const myselfResult = await validateTrackerMyselfEndpoint(api);
  if (!myselfResult.ok) {
    return myselfResult;
  }

  return validateTrackerUsersAdminEndpoint(api);
}

/**
 * Проверка PAT/Basic Jira: `GET /myself` с Bearer (DC) или Basic (Cloud).
 * Список `/users` Яндекса сюда не ходит — на Jira Server он даёт 401/404.
 */
export async function validateJiraTrackerToken(params: {
  apiToken: string;
  apiUrl: string;
  email?: string;
}): Promise<ValidateTrackerCredentialsResult> {
  const token = cleanOrganizationTrackerToken(params.apiToken);
  if (!token) {
    return { message: 'Токен пустой после нормализации', ok: false, status: 400 };
  }

  let apiUrl: string;
  try {
    apiUrl = normalizeTrackerApiBaseUrl(params.apiUrl);
  } catch {
    return { message: 'Некорректный URL API трекера', ok: false, status: 400 };
  }

  const api = createJiraAxiosInstance({
    apiToken: token,
    apiUrl,
    email: params.email,
  });
  const myselfResult = await validateTrackerMyselfEndpoint(api);
  if (!myselfResult.ok) {
    return myselfResult;
  }
  return { message: 'Токен валиден, доступ к Jira подтверждён', ok: true };
}

/** Проверка токена выбранного провайдера инстанса до сохранения в organization_secrets. */
export function validateIssueTrackerCredentials(params: {
  apiUrl: string;
  email?: string;
  oauthToken: string;
  orgId: string;
}): Promise<ValidateTrackerCredentialsResult> {
  if (isJiraProviderKind(getIssueTrackerProviderKind())) {
    return validateJiraTrackerToken({
      apiToken: params.oauthToken,
      apiUrl: params.apiUrl,
      email: params.email,
    });
  }
  return validateYandexTrackerOAuth(params);
}
