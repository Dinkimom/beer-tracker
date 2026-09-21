/**
 * Нормализует значение тегов в массив строк.
 * В БД и API теги могут приходить как массив или как JSON-строка.
 */
function parseTagsFromArray(value: unknown[]): string[] {
  return value.every((item): item is string => typeof item === 'string')
    ? value
    : value.map((item) => (typeof item === 'string' ? item : String(item)));
}

function parseTagsFromString(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function parseTags(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return parseTagsFromArray(value);
  if (typeof value === 'string') return parseTagsFromString(value);
  return [];
}
