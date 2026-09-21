import type { PlanningPhaseCardColorScheme } from '@/hooks/useLocalStorage';

import { getStickyNoteResizeHandlePaint } from '@/features/comments/utils/stickyNotePalette';
import { getPhotoCardResizeHandlePaint } from '@/features/task/utils/photoCardSurface';
import {
  getResizeHandleColors,
  resolveStatusForPhaseCardColors,
  type getResizeHandleColors as GetResizeHandleColorsFn,
} from '@/utils/statusColors';

type ResizeHandleColors = ReturnType<typeof GetResizeHandleColorsFn>;

export function resolveTaskBarResizeHandleColors(input: {
  isDraftTask: boolean;
  isQATask: boolean;
  originalStatus?: string;
  phaseCardColorScheme: PlanningPhaseCardColorScheme;
  /** Override из настроек интеграции — тот же ключ, что у карточки (`statusColorKey`). */
  statusColorKey?: string;
}): {
  hoverBgClass: string;
  hoverBgClassDark: string;
  resizeHandleColors: ResizeHandleColors;
} {
  const statusForColors = resolveStatusForPhaseCardColors(
    input.phaseCardColorScheme,
    input.originalStatus,
    input.statusColorKey
  );
  const resizeHandleColors = input.isDraftTask
    ? getResizeHandleColors('todo', false, input.phaseCardColorScheme)
    : getResizeHandleColors(statusForColors, input.isQATask, input.phaseCardColorScheme);

  return {
    hoverBgClass: resizeHandleColors.hoverBg,
    hoverBgClassDark: resizeHandleColors.hoverBgDark,
    resizeHandleColors,
  };
}

export function resolveTaskBarResizeHandleTitle(
  side: 'left' | 'right',
  t: (key: string) => string
): string {
  return side === 'right'
    ? t('task.taskBar.resizeRightTitle')
    : t('task.taskBar.resizeLeftTitle');
}

export function isTaskBarResizeHandleActive(
  isResizing: boolean,
  resizeSide: 'left' | 'right' | null,
  side: 'left' | 'right'
): boolean {
  return isResizing && resizeSide === side;
}

/**
 * Плавное появление/исчезновение грипа.
 * Класс из globals.css: сброс transitions при смене темы гасит Tailwind utilities.
 * Появление с hover-intent delay, скрытие без delay — см. `.task-bar-resize-handle-visual`.
 */
export const RESIZE_HANDLE_VISUAL_TRANSITION_CLASS = 'task-bar-resize-handle-visual';
const RESIZE_HANDLE_VISUAL_ACTIVE_CLASS = 'task-bar-resize-handle-visual--active';

/** Грип виден при CSS :hover самой рукоятки или во время активного ресайза (без JS-isHovering). */
export function getResizeHandleVisualVisibilityClass(isActive: boolean): string {
  if (isActive) return `opacity-100 ${RESIZE_HANDLE_VISUAL_ACTIVE_CLASS}`;
  return 'opacity-0 group-hover/resize-handle:opacity-100';
}

export function getResizeHandleEdgeClass(side: 'left' | 'right'): string {
  return side === 'left' ? 'left-0' : 'right-0';
}

export type ResizeHandleCornerStyle = 'flat' | 'photo' | 'rounded' | 'square';

/** Радиус фона рукоятки совпадает с карточкой: задача 8px, фото и заметка без скругления. */
export function getResizeHandleRoundedClass(
  side: 'left' | 'right',
  cornerStyle: ResizeHandleCornerStyle = 'rounded'
): string {
  if (cornerStyle === 'square' || cornerStyle === 'photo' || cornerStyle === 'flat') {
    return 'rounded-none';
  }
  return side === 'left' ? 'rounded-l-lg' : 'rounded-r-lg';
}

export function resolveResizeHandleCornerStyle(
  isPhotoCard: boolean,
  isStickyNote: boolean
): ResizeHandleCornerStyle {
  if (isPhotoCard) return 'photo';
  if (isStickyNote) return 'square';
  return 'rounded';
}

export function getDragSourceGhostRadiusClass(cornerStyle: ResizeHandleCornerStyle): string {
  if (cornerStyle === 'square' || cornerStyle === 'photo') return 'rounded-none';
  return 'rounded-xl';
}

/** Радиус фона лоадера совпадает с карточкой: задача 8px, фото и заметка без скругления. */
export function getQuickAddSubmittingOverlayRadiusClass(
  cornerStyle: ResizeHandleCornerStyle = 'rounded'
): string {
  if (cornerStyle === 'square' || cornerStyle === 'photo') return 'rounded-none';
  return 'rounded-lg';
}

export function getResizeHandleGripOffsetClass(side: 'left' | 'right'): string {
  return side === 'left' ? 'left-1.5' : 'right-1.5';
}

export function getResizeHandleHitAreaOffsetClass(side: 'left' | 'right'): string {
  return side === 'left' ? '-left-2' : '-right-2';
}

function isCompactVerticalResizeHandle(cornerStyle: ResizeHandleCornerStyle): boolean {
  return cornerStyle === 'square' || cornerStyle === 'photo';
}

export function getResizeHandleVerticalHeightClass(
  cornerStyle: ResizeHandleCornerStyle = 'rounded'
): string {
  return isCompactVerticalResizeHandle(cornerStyle) ? 'h-4' : 'h-6';
}

export function getResizeHandleVerticalEdgeClass(side: 'bottom' | 'top'): string {
  return side === 'top' ? 'top-0' : 'bottom-0';
}

/** Top/bottom backdrop — на всю ширину hit-area карточки. */
export function getResizeHandleVerticalBackdropInsetClass(): string {
  return 'inset-0';
}

export function getResizeHandleVerticalGripOffsetClass(
  side: 'bottom' | 'top',
  cornerStyle: ResizeHandleCornerStyle = 'rounded'
): string {
  if (isCompactVerticalResizeHandle(cornerStyle)) {
    return side === 'top' ? 'top-1' : 'bottom-1';
  }
  return side === 'top' ? 'top-1.5' : 'bottom-1.5';
}

export function getResizeHandleVerticalGripLineSizeClass(
  cornerStyle: ResizeHandleCornerStyle = 'rounded'
): string {
  return isCompactVerticalResizeHandle(cornerStyle) ? 'w-2' : 'w-3';
}

export function isTaskBarVerticalResizeHandleActive(
  isResizing: boolean,
  resizeSide: 'bottom' | 'top' | null,
  side: 'bottom' | 'top'
): boolean {
  return isResizing && resizeSide === side;
}

export function resolveTaskBarVerticalResizeHandleTitle(
  side: 'bottom' | 'top',
  t: (key: string) => string
): string {
  return side === 'bottom'
    ? t('task.taskBar.resizeBottomTitle')
    : t('task.taskBar.resizeTopTitle');
}

export function getResizeHandleHoverBackgroundClasses(
  isActive: boolean,
  resizeHandleColors: ResizeHandleColors,
  hoverBgClass: string,
  hoverBgClassDark: string
): string {
  if (isActive) {
    return `${resizeHandleColors.bg} ${resizeHandleColors.bgDark}`;
  }
  return `${hoverBgClass} ${hoverBgClassDark}`;
}

export function getResizeHandleGripLineClasses(
  isActive: boolean,
  resizeHandleColors: ResizeHandleColors
): string {
  if (isActive) {
    return `${resizeHandleColors.line} ${resizeHandleColors.lineDark}`;
  }
  return `${resizeHandleColors.line} ${resizeHandleColors.lineDark} opacity-40 group-hover/resize-handle:opacity-100`;
}

export function getResizeHandleInlineGripOpacityClass(isActive: boolean): string {
  if (isActive) return '';
  return 'opacity-40 group-hover/resize-handle:opacity-100';
}

export interface TaskBarResizeHandleInlinePaint {
  background: string;
  line: string;
}

export function resolveStickyNoteResizeHandleInlinePaint(
  color: string | null | undefined,
  isDark: boolean,
  isActive: boolean
): TaskBarResizeHandleInlinePaint {
  const paint = getStickyNoteResizeHandlePaint(color, isDark);
  return {
    background: isActive ? paint.activeBackground : paint.hoverBackground,
    line: paint.line,
  };
}

export function resolvePhotoCardResizeHandleInlinePaint(
  isDark: boolean,
  isActive: boolean
): TaskBarResizeHandleInlinePaint {
  const paint = getPhotoCardResizeHandlePaint(isDark);
  return {
    background: isActive ? paint.activeBackground : paint.hoverBackground,
    line: paint.line,
  };
}

export function resolveTaskBarResizeHandleInlinePaint(
  cornerStyle: ResizeHandleCornerStyle,
  isDark: boolean,
  isActive: boolean,
  stickyNoteColor?: string | null
): TaskBarResizeHandleInlinePaint | undefined {
  if (cornerStyle === 'square') {
    return resolveStickyNoteResizeHandleInlinePaint(stickyNoteColor, isDark, isActive);
  }
  if (cornerStyle === 'photo') {
    return resolvePhotoCardResizeHandleInlinePaint(isDark, isActive);
  }
  return undefined;
}
