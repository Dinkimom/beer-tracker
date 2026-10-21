import type { StatusColorGroup } from '@/utils/statusColors';

/**
 * Поверхность факта: светлая палитра сайдбара (`*-50` + обводка `*-200`) — тише карточек плана,
 * но в том же языке «заливка + обводка». В тёмной теме приглушаем по насыщенности
 * (opacity не используем — через неё просвечивает сетка).
 */
export function factStatusSurfaceClass(statusColors: StatusColorGroup): string {
  return statusColors.sidebarDark
    ? `border ${statusColors.sidebar} ${statusColors.sidebarDark} dark:saturate-[0.55]`
    : `border ${statusColors.sidebar}`;
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
