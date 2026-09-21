function parseNumericString(value: string): number {
  const parsed = Number(value.replace(',', '.'));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function readNumberFromStringField(value: unknown): number | null {
  return typeof value === 'string' && value.trim() !== '' ? parseNumericString(value) : null;
}

function readNumberFromObject(value: Record<string, unknown>): number {
  const record = value as { key?: string; display?: string; value?: unknown };
  if (typeof record.value === 'number' && !Number.isNaN(record.value)) {
    return record.value;
  }
  return (
    readNumberFromStringField(record.value) ??
    readNumberFromStringField(record.key) ??
    readNumberFromStringField(record.display) ??
    0
  );
}

export function asNumber(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  const fromString = readNumberFromStringField(value);
  if (fromString != null) {
    return fromString;
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return readNumberFromObject(value as Record<string, unknown>);
  }
  return 0;
}

function isTruthyStringValue(value: string): boolean {
  return value === 'true' || value === 'yes' || value === '1' || value === 'да' || value === 'on';
}

function readBooleanFromObject(value: Record<string, unknown>): boolean {
  const key = (value as { key?: string }).key?.trim().toLowerCase() ?? '';
  const display = (value as { display?: string }).display?.trim().toLowerCase() ?? '';
  return isTruthyStringValue(key) || isTruthyStringValue(display);
}

export function asBoolean(value: unknown): boolean {
  if (value === true || value === 1) {
    return true;
  }
  if (typeof value === 'string') {
    return isTruthyStringValue(value.trim().toLowerCase());
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return readBooleanFromObject(value as Record<string, unknown>);
  }
  return false;
}

const DATE_OBJECT_KEYS = ['iso', 'date', 'value', 'display', 'self', 'href'] as const;

function readDateCandidateFromObject(record: Record<string, unknown>): string | undefined {
  for (const key of DATE_OBJECT_KEYS) {
    const candidate = record[key];
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return undefined;
}

function asDateStringFromPrimitive(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  return undefined;
}

export function asDateString(value: unknown): string | undefined {
  const primitive = asDateStringFromPrimitive(value);
  if (primitive) {
    return primitive;
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return readDateCandidateFromObject(value as Record<string, unknown>);
  }
  return undefined;
}
