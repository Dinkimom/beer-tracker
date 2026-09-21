import { isKnownStatusPaletteKey, normalizeStatusKey } from '@/utils/statusColors';

import { defaultPaletteKeyForTrackerStatusType } from './statusTypeDefaults';

interface StatusVisualOverride {
  visualToken?: string;
}

/**
 * visualToken из overrides админки: сначала точный ключ статуса трекера, иначе нормализованный.
 */
export function visualTokenForStatusKey(
  statusKey: string | undefined,
  overrides: Record<string, StatusVisualOverride> | null | undefined
): string | undefined {
  const sk = statusKey?.trim();
  if (!sk || !overrides) {
    return undefined;
  }
  const direct = overrides[sk]?.visualToken?.trim();
  if (direct) {
    return direct;
  }
  const norm = normalizeStatusKey(sk);
  if (!norm) {
    return undefined;
  }
  for (const [key, val] of Object.entries(overrides)) {
    if (normalizeStatusKey(key) !== norm) {
      continue;
    }
    const visual = val.visualToken?.trim();
    if (visual) {
      return visual;
    }
  }
  return undefined;
}

/**
 * Дефолт палитры без visualToken override:
 * 1) ключ статуса, если он есть в STATUS_COLOR_MAP (`blocked` → красный);
 * 2) иначе палитра по типу статуса трекера (Jira category `inProgress` → синий);
 * 3) иначе нормализованный ключ статуса.
 *
 * Важно: у Jira «Blocked» часто category = inProgress — без шага (1) карточка
 * ошибочно становится синей, хотя в карте цветов `blocked` красный.
 */
export function defaultPaletteKeyForTrackerStatus(
  statusKey: string | undefined,
  statusTypeKey: string | undefined
): string | undefined {
  const sk = statusKey?.trim();
  if (sk && isKnownStatusPaletteKey(sk)) {
    return normalizeStatusKey(sk);
  }
  const fromType = defaultPaletteKeyForTrackerStatusType(statusTypeKey);
  if (fromType) {
    return fromType;
  }
  if (!sk) {
    return undefined;
  }
  return normalizeStatusKey(sk) || undefined;
}

/**
 * Ключ палитры карточки: visualToken override → дефолт по статусу/типу.
 */
export function resolveStatusColorKey(
  statusKey: string | undefined,
  statusTypeKey: string | undefined,
  overrides: Record<string, StatusVisualOverride> | null | undefined
): string | undefined {
  return (
    visualTokenForStatusKey(statusKey, overrides) ||
    defaultPaletteKeyForTrackerStatus(statusKey, statusTypeKey)
  );
}
