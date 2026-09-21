/**
 * Утилиты для создания Tracker API клиентов с поддержкой пользовательских токенов
 */

import type { AxiosInstance } from 'axios';

import { createIssueTrackerAxiosForCredentials } from './issueTrackerProvider/createIssueTrackerAxios';
import { resolveTrackerApiConfigFromRequest } from './trackerRequestConfig';

/**
 * Создает экземпляр axios для Tracker API с кастомными креденшалами
 * Используйте этот экспорт только на серверной стороне (в API routes)
 */
export function createTrackerApiClient(config: {
  apiUrl?: string;
  jiraEmail?: string;
  oauthToken: string;
  orgId: string;
}): AxiosInstance {
  return createIssueTrackerAxiosForCredentials({
    apiUrl: config.apiUrl ?? '',
    jiraEmail: config.jiraEmail,
    oauthToken: config.oauthToken,
    orgId: config.orgId,
  });
}

/**
 * Создает экземпляр Tracker API клиента из запроса Next.js
 * (токен из заголовка, Cloud Org ID и URL — из tenant в БД или из env).
 */
export async function createTrackerApiFromRequest(request: Request): Promise<AxiosInstance> {
  return createIssueTrackerAxiosForCredentials(await resolveTrackerApiConfigFromRequest(request));
}
