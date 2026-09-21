/**
 * API аутентификации (валидация токена Tracker, текущий пользователь).
 */

import type { TrackerMyselfUser } from './types';
import type { AxiosError } from 'axios';

import { getPlannerBeerTrackerApi } from '../plannerBeerTrackerApiOverride';

function validateTokenErrorResult(error: unknown): {
  error: string;
  valid: false;
} {
  console.error('Failed to validate token:', error);
  const ax = error as AxiosError<{ error?: string }>;
  const fromApi =
    ax.response?.data && typeof ax.response.data === 'object' ? ax.response.data.error : undefined;
  return {
    valid: false,
    error:
      typeof fromApi === 'string' && fromApi.trim()
        ? fromApi
        : 'Ошибка при проверке токена. Попробуйте еще раз.',
  };
}

/**
 * Возвращает данные текущего пользователя из Tracker (GET /myself).
 * Требует заголовок X-Tracker-Token (добавляется beerTrackerApi автоматически).
 */
export async function getMyself(): Promise<TrackerMyselfUser> {
  const { data } = await getPlannerBeerTrackerApi().get<TrackerMyselfUser>('/auth/myself');
  return data;
}

/**
 * Валидирует OAuth токен Яндекс Трекера.
 * `organizationId` — UUID организации продукта (если не передан, сервер читает заголовок X-Organization-Id).
 */
export async function validateToken(
  token: string,
  options?: { email?: string; organizationId?: string }
): Promise<{
  error?: string;
  valid: boolean;
}> {
  try {
    const { data } = await getPlannerBeerTrackerApi().post('/auth/validate-token', {
      email: options?.email?.trim() || undefined,
      organizationId: options?.organizationId?.trim() || undefined,
      token: token.trim(),
    });
    return {
      valid: data.valid || false,
      error: data.error,
    };
  } catch (error) {
    return validateTokenErrorResult(error);
  }
}

interface ProductSessionResponse {
  organizations?: Array<{
    canAccessAdmin?: boolean;
    canUsePlanner?: boolean;
    id: string;
    managedTeamIds?: string[] | null;
    name: string;
    role: 'member' | 'org_admin' | 'team_lead';
    slug: string | null;
  }>;
  user: { email: string; emailVerified: boolean; id: string } | null;
}

export async function fetchProductSession(): Promise<ProductSessionResponse> {
  const { data } = await getPlannerBeerTrackerApi().get<ProductSessionResponse>('/auth/session');
  return data;
}

export async function postProductRegister(body: {
  jiraEmail?: string;
  orgName: string;
  token: string;
  trackerOrgId?: string;
}): Promise<{ organization: { id: string; name: string; slug: string } }> {
  const { data } = await getPlannerBeerTrackerApi().post('/auth/register', body);
  return data;
}

export async function postProductLogout(): Promise<void> {
  await getPlannerBeerTrackerApi().post('/auth/logout');
}

export async function fetchAdminTrackerConnectionState(
  organizationId: string,
  options?: { signal?: AbortSignal }
): Promise<{
  hasStoredToken?: boolean;
  organizationId?: string;
  trackerOrgId?: string;
}> {
  const { data } = await getPlannerBeerTrackerApi().get(
    `/admin/organizations/${organizationId}/tracker`,
    { signal: options?.signal }
  );
  return data;
}
