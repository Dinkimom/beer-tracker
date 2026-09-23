import { isKnownStatusPaletteKey, normalizeStatusKey } from '@/utils/statusColors';

import { defaultPaletteKeyForTrackerStatusType } from './statusTypeDefaults';

interface StatusVisualOverride {
  visualToken?: string;
}

function readVisualToken(
  overrides: Record<string, StatusVisualOverride>,
  key: string
): string | undefined {
  return overrides[key]?.visualToken?.trim() || undefined;
}

function visualTokenFromAlternateKeys(
  overrides: Record<string, StatusVisualOverride>,
  alternateKeys: readonly string[] | null | undefined
): string | undefined {
  for (const alt of alternateKeys ?? []) {
    const key = alt.trim();
    if (!key) {
      continue;
    }
    const fromAlt = readVisualToken(overrides, key);
    if (fromAlt) {
      return fromAlt;
    }
  }
  return undefined;
}

function visualTokenFromNormalizedKey(
  overrides: Record<string, StatusVisualOverride>,
  statusKey: string
): string | undefined {
  const norm = normalizeStatusKey(statusKey);
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
 * visualToken из overrides админки: status id (alternateKeys) first, then name key,
 * then normalized name key (legacy configs).
 */
export function visualTokenForStatusKey(
  statusKey: string | undefined,
  overrides: Record<string, StatusVisualOverride> | null | undefined,
  alternateKeys?: readonly string[] | null
): string | undefined {
  const sk = statusKey?.trim();
  if (!overrides) {
    return undefined;
  }
  const fromAlt = visualTokenFromAlternateKeys(overrides, alternateKeys);
  if (fromAlt) {
    return fromAlt;
  }
  if (sk) {
    const direct = readVisualToken(overrides, sk);
    if (direct) {
      return direct;
    }
  }
  return sk ? visualTokenFromNormalizedKey(overrides, sk) : undefined;
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
 * `alternateKeys` — status id (unique); overrides are keyed by id when available.
 */
export function resolveStatusColorKey(
  statusKey: string | undefined,
  statusTypeKey: string | undefined,
  overrides: Record<string, StatusVisualOverride> | null | undefined,
  alternateKeys?: readonly string[] | null
): string | undefined {
  return (
    visualTokenForStatusKey(statusKey, overrides, alternateKeys) ||
    defaultPaletteKeyForTrackerStatus(statusKey, statusTypeKey)
  );
}
