/**
 * Обводка фазы (режим создания связей, редактор отрезков и т.п.).
 * Вынесено в одно место, чтобы единообразно включать/выключать и менять стиль при необходимости.
 */

/** Обводка «источник» (фаза в режиме связей, редактор отрезков) */
export const PHASE_FOCUS_RING_SOURCE =
  'ring-2 ring-blue-500 dark:ring-blue-400 ring-offset-2 ring-offset-white dark:ring-offset-gray-800';

/** Обводка «цель» (фаза — возможная цель связи) */
const PHASE_FOCUS_RING_TARGET =
  'ring-2 ring-blue-400/70 dark:ring-blue-500/70 ring-offset-2 ring-offset-white dark:ring-offset-gray-800';

type PhaseFocusRingVariant = 'source' | 'target';

/** Возвращает класс обводки, если нужно показать, иначе пустую строку */
export function getPhaseFocusRingClass(
  show: boolean,
  variant: PhaseFocusRingVariant = 'source'
): string {
  if (!show) return '';
  return variant === 'source' ? PHASE_FOCUS_RING_SOURCE : PHASE_FOCUS_RING_TARGET;
}
