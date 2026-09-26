import type { StatusColorGroup } from '@/utils/statusColors';

export function combineStatusBgClass(statusColors: StatusColorGroup): string {
  return statusColors.bgDark ? `${statusColors.bg} ${statusColors.bgDark}` : statusColors.bg;
}

export function combineStatusBorderClass(statusColors: StatusColorGroup): string {
  return statusColors.borderDark
    ? `${statusColors.border} ${statusColors.borderDark}`
    : statusColors.border;
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
