/**
 * Состояние формы подключения трекера в админке и чистая проверка готовности.
 * Отдельный файл без импортов БД/BullMQ — безопасен для клиентских бандлов.
 */

import type { IssueTrackerProviderKind } from '@/lib/issueTrackerProvider/types';

export interface OrganizationTrackerAdminFormState {
  /** Сохранённый URL API; пусто, если трекер ещё не выбран. */
  apiUrl: string;
  hasStoredToken: boolean;
  /** Email Atlassian-аккаунта org API-токена (Jira Cloud Basic); пусто для других провайдеров. */
  jiraEmail: string;
  /** UUID организации в продукте (tenant). */
  organizationId: string;
  /** `null` — трекер не выбран (онбординг не завершён). */
  provider: IssueTrackerProviderKind | null;
  /** После первой синхронизации тип трекера менять нельзя. */
  providerLocked: boolean;
  trackerOrgId: string;
}

/**
 * Достаточно ли настроек для вызовов API трекера.
 * Jira Cloud: OAuth с регистрации не заменяет API-токен организации — нужен ещё email аккаунта.
 */
export function isOrganizationTrackerConnectionReady(
  state: OrganizationTrackerAdminFormState | null | undefined
): boolean {
  if (!state?.provider || !state.hasStoredToken || state.trackerOrgId.trim() === '') {
    return false;
  }
  return state.provider !== 'jira-cloud' || state.jiraEmail.trim() !== '';
}
