import { resolveStatusColorKey } from '@/lib/trackerIntegration/statusPalette';
import { getStatusColors } from '@/utils/statusColors';

/**
 * Палитра кнопки перехода: visualToken из интеграции → ключ статуса → тип/категория.
 * Без statusTypeKey кастомные Jira-статусы (кириллица и т.п.) остаются серыми DEFAULT.
 * `alternateKeys` — Jira status id, если overrides в админке ключуются по id.
 */
export function resolveTransitionStatusColorClasses(
  statusKey: string | undefined,
  statusTypeKey: string | undefined,
  overrides: Record<string, { visualToken?: string }> | null | undefined,
  alternateKeys?: readonly string[] | null
): { bg: string; border: string; text: string } {
  const paletteKey = resolveStatusColorKey(statusKey, statusTypeKey, overrides, alternateKeys);
  const c = getStatusColors(paletteKey);
  return {
    bg: `${c.bg} ${c.bgDark ?? ''}`.trim(),
    border: `${c.border} ${c.borderDark ?? ''}`.trim(),
    text: `${c.text} ${c.textDark ?? ''}`.trim(),
  };
}
