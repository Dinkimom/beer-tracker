/**
 * Story/test points в changelog: число у Yandex и `{ display, id, key }` у Jira.
 * Нечисловое значение не должно превращаться в NaN на графике.
 */

const POINT_OBJECT_KEYS = ['value', 'display', 'key', 'id'] as const;

function readFiniteNumber(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

function readNumericString(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return readFiniteNumber(Number(trimmed));
}

function readPointObject(value: object): number | null {
  const record = value as Record<string, unknown>;
  for (const key of POINT_OBJECT_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) continue;
    const parsed = readChangelogPointValue(record[key]);
    if (parsed != null) return parsed;
  }
  return null;
}

export function readChangelogPointValue(value: unknown): number | null {
  if (typeof value === 'number') return readFiniteNumber(value);
  if (typeof value === 'string') return readNumericString(value);
  if (!value || typeof value !== 'object') return null;
  return readPointObject(value);
}

export function changelogPointOrZero(value: unknown): number {
  return readChangelogPointValue(value) ?? 0;
}
