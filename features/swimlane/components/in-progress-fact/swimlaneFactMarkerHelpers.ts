import type { StatusColorGroup } from '@/utils/statusColors';

/**
 * Заливка факта: светлая палитра карточек как есть; в тёмной `bg-*-900` приглушаем по насыщенности,
 * чтобы факт был тише карточек плана (opacity не используем — через неё просвечивает сетка).
 */
export function combineStatusBgClass(statusColors: StatusColorGroup): string {
  return statusColors.bgDark
    ? `${statusColors.bg} ${statusColors.bgDark} dark:saturate-[0.55]`
    : statusColors.bg;
}

export function factSegmentPointerHoverHandlers(
  onFactSegmentHover: ((taskId: string | null) => void) | undefined,
  taskId: string
): {
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
} {
  if (!onFactSegmentHover) {
    return {};
  }
  return {
    onPointerEnter: () => onFactSegmentHover(taskId),
    onPointerLeave: () => onFactSegmentHover(null),
  };
}

/**
 * Какой задаче принадлежат яркие бары факта.
 * Hover колбасы и hover карточки стартуют вместе с тенью карточки.
 */
export function resolveFactBarFocusTaskId(
  factHoveredTaskId: string | null,
  cardShadowTaskId: string | null
): string | null {
  if (factHoveredTaskId != null) return factHoveredTaskId;
  return cardShadowTaskId;
}

export function resolveFactMarkerHoverState(
  factHoveredTaskId: string | null | undefined,
  taskId: string
): { isDimmedByFactHover: boolean; isFactHovered: boolean } {
  const isFactHovered = factHoveredTaskId === taskId;
  const isDimmedByFactHover =
    factHoveredTaskId != null && factHoveredTaskId !== taskId;
  return { isFactHovered, isDimmedByFactHover };
}
