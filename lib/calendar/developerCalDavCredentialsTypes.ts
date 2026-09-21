/**
 * Учётные данные CalDAV Mail.ru для чтения занятости исполнителя (локально в браузере).
 */
export interface DeveloperCalDavCredentials {
  /** Пароль для внешнего приложения Mail.ru. */
  appPassword: string;
  /** URL коллекции CalDAV (…/principals/…/calendars/{uuid}/). */
  caldavUrl: string;
  /** Полный email для Basic auth (например jane.doe@example.com). */
  email: string;
  /** ISO-время последнего сохранения (для отладки). */
  updatedAt?: string;
}

export type DeveloperCalDavCredentialsMap = Record<string, DeveloperCalDavCredentials>;
