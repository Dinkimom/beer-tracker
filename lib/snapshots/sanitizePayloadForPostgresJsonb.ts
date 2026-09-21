/**
 * PostgreSQL json/jsonb отклоняет часть того, что допускает JSON.stringify (NUL в строках,
 * одиночные UTF-16 суррогаты) — ошибка «unsupported Unicode escape sequence».
 */

export {
  deepSanitizeForPostgresJsonb,
  sanitizeStringForPostgresJsonb,
  stringifyForPostgresJsonb,
} from './sanitizePayloadForPostgresJsonbHelpers';
