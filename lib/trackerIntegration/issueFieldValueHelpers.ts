const URL_FIELD_KEYS = ['self', 'href', 'url'] as const;

function readTrimmedStringProperty(
  obj: Record<string, unknown>,
  key: string
): string {
  const value = obj[key];
  return typeof value === 'string' ? value.trim() : '';
}

function readFirstNonEmptyUrlFromObject(v: object): string {
  const record = v as Record<string, unknown>;
  for (const key of URL_FIELD_KEYS) {
    const trimmed = readTrimmedStringProperty(record, key);
    if (trimmed) {
      return trimmed;
    }
  }
  return '';
}

export function readUrlFieldValue(v: unknown): string {
  if (typeof v === 'string') {
    return v.trim();
  }
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return readFirstNonEmptyUrlFromObject(v);
  }
  return '';
}

function readObjectPropertyToken(v: object, property: 'display' | 'key'): string {
  if (!(property in v)) {
    return '';
  }
  const raw = (v as Record<string, string | undefined>)[property];
  return typeof raw === 'string' ? raw.trim() : '';
}

function readStringTokenFromObject(v: object): string {
  if (Array.isArray(v)) {
    return '';
  }
  if ('key' in v) {
    return readObjectPropertyToken(v, 'key');
  }
  if ('display' in v) {
    return readObjectPropertyToken(v, 'display');
  }
  return String(v).trim();
}

export function readStringTokenFromUnknown(v: unknown): string {
  if (v == null) {
    return '';
  }
  if (typeof v === 'string') {
    return v.trim();
  }
  if (typeof v === 'object') {
    return readStringTokenFromObject(v);
  }
  return String(v).trim();
}
