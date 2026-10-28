function extractStatusKeyFromObject(value: object): string | undefined {
  if (!('key' in value)) {
    return undefined;
  }
  const k = (value as { key?: unknown }).key;
  return typeof k === 'string' ? k : undefined;
}

/** Ключ статуса из поля changelog: строка или объект `{ key }`. */
export function extractStatusKey(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return extractStatusKeyFromObject(value);
  }
  return undefined;
}
