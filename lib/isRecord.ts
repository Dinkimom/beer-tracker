/** Обычный объект (не null и не массив) — для разбора JSON/JSONB и ответов внешних API. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Объект как `Record`, иначе `null`. */
export function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}
