/**
 * Состояние формы «Яндекс Трекер» в админке и чистая проверка готовности.
 * Отдельный файл без импортов БД/BullMQ — безопасен для клиентских бандлов.
 */

export interface OrganizationTrackerAdminFormState {
  hasStoredToken: boolean;
  /** Email Atlassian-аккаунта org API-токена (Jira Cloud Basic); пусто для других провайдеров. */
  jiraEmail: string;
  /** UUID организации в продукте (tenant). */
  organizationId: string;
  trackerOrgId: string;
}

/** Достаточно ли настроек для вызовов API Трекера (секрет + Cloud Organization ID). */
export function isOrganizationTrackerConnectionReady(
  state: OrganizationTrackerAdminFormState | null | undefined
): boolean {
  if (!state) return false;
  return Boolean(state.hasStoredToken && state.trackerOrgId.trim() !== '');
}
