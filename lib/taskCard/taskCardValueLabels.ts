import { isRecord } from '@/lib/isRecord';

const MAX_ENTRIES = 40;
const MAX_LABEL_LENGTH = 80;
const MAX_OPTION_LENGTH = 200;


function shortLabel(labels: Readonly<Record<string, string>>, key: string): string {
  return labels[key]?.trim() ?? '';
}

/** Короткие имена значений. Пустая подпись не хранится: на карточке остаётся текст трекера. */
export function readTaskCardValueLabels(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const out: Record<string, string> = {};
  for (const [rawKey, rawLabel] of Object.entries(value)) {
    if (Object.keys(out).length >= MAX_ENTRIES) {
      break;
    }
    const key = rawKey.trim().slice(0, MAX_OPTION_LENGTH);
    if (!key || typeof rawLabel !== 'string') {
      continue;
    }
    const label = rawLabel.slice(0, MAX_LABEL_LENGTH);
    if (!label.trim()) {
      continue;
    }
    out[key] = label;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function mergeTaskCardValueLabel(
  current: Readonly<Record<string, string>> | undefined,
  option: string,
  label: string
): Record<string, string> | undefined {
  const key = option.trim().slice(0, MAX_OPTION_LENGTH);
  if (!key) {
    return current ? { ...current } : undefined;
  }
  const next = { ...(current ?? {}) };
  const stored = label.slice(0, MAX_LABEL_LENGTH);
  if (!stored.trim()) {
    delete next[key];
  } else {
    next[key] = stored;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

/** Подменяет значение поля коротким именем. Несколько значений через запятую меняются по отдельности. */
export function applyTaskCardValueLabels(
  value: string,
  labels: Readonly<Record<string, string>> | undefined
): string {
  if (!labels) {
    return value;
  }
  const exact = shortLabel(labels, value);
  if (exact) {
    return exact;
  }
  if (!value.includes(', ')) {
    return value;
  }
  const parts = value.split(', ');
  const mapped: string[] = [];
  let changed = false;
  for (const part of parts) {
    const short = shortLabel(labels, part);
    if (short) {
      changed = true;
      mapped.push(short);
    } else {
      mapped.push(part);
    }
  }
  if (!changed) {
    return value;
  }
  return mapped.join(', ');
}
