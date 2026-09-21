/**
 * Текстовое представление UUID как у PostgreSQL / реестра (8-4-4-4-12 hex).
 * Zod `z.string().uuid()` требует RFC 4122 (вариант в 4-й группе — 8/9/a/b),
 * поэтому не подходит для части реальных `uuid` из БД (например `…-fa98-…`).
 */
export const REGISTRY_UUID_STRING_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/** UUID организации/сотрудника из БД или заголовка; `null` если строка не 8-4-4-4-12 hex. */
export function parseRegistryUuidString(raw: string | null | undefined): string | null {
  const value = raw?.trim() ?? '';
  if (!value || !REGISTRY_UUID_STRING_RE.test(value)) {
    return null;
  }
  return value;
}
