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

export type ResizeHandleSide = 'bottom' | 'left' | 'right' | 'top';

const RESIZE_HANDLE_TITLE_KEY: Record<ResizeHandleSide, string> = {
  bottom: 'task.taskBar.resizeBottomTitle',
  left: 'task.taskBar.resizeLeftTitle',
  right: 'task.taskBar.resizeRightTitle',
  top: 'task.taskBar.resizeTopTitle',
};

export function resolveTaskBarResizeHandleTitle(
  side: ResizeHandleSide,
  t: (key: string) => string
): string {
  return t(RESIZE_HANDLE_TITLE_KEY[side]);
}

export function isTaskBarResizeHandleActive(
  isResizing: boolean,
  resizeSide: ResizeHandleSide | null,
  side: ResizeHandleSide
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

/** Раскладка рукоятки по стороне: чем горизонтальная отличается от вертикальной. */
interface TaskBarResizeHandleLayout {
  /** Фон: отступы и радиус. */
  backgroundClass: string;
  /** Позиция и направление ряда линий грипа. */
  gripClass: string;
  /** Одна линия грипа: размер. */
  gripLineClass: string;
  /** Зона захвата: прижата к стороне карточки, курсор по оси. */
  hitClass: string;
  /** Дополнительная зона захвата за краем карточки (только слева/справа). */
  hitOverhangClass: string | null;
  nudgeAxis: 'x' | 'y';
  /** Куда толкается грип, когда карточка растёт. */
  nudgeDirection: -1 | 1;
}

/** Классы целиком, без сборки из строк: иначе Tailwind их не найдёт. */
const RESIZE_HANDLE_SIDE_CLASSES = {
  bottom: { edge: 'bottom-0', grip: 'bottom-1.5', gripCompact: 'bottom-1' },
  left: { edge: 'left-0', grip: 'left-1.5', overhang: '-left-2' },
  right: { edge: 'right-0', grip: 'right-1.5', overhang: '-right-2' },
  top: { edge: 'top-0', grip: 'top-1.5', gripCompact: 'top-1' },
} as const;

export function resolveTaskBarResizeHandleLayout(
  side: ResizeHandleSide,
  cornerStyle: ResizeHandleCornerStyle = 'rounded'
): TaskBarResizeHandleLayout {
  if (side === 'left' || side === 'right') {
    const classes = RESIZE_HANDLE_SIDE_CLASSES[side];
    return {
      backgroundClass: `inset-0 ${getResizeHandleRoundedClass(side, cornerStyle)}`,
      gripClass: `${classes.grip} top-1/2 -translate-y-1/2 flex flex-col gap-0.5`,
      gripLineClass: 'task-bar-resize-grip-line w-0.5 h-3',
      hitClass: `${classes.edge} top-0 bottom-0 w-6 cursor-ew-resize`,
      hitOverhangClass: classes.overhang,
      nudgeAxis: 'x',
      nudgeDirection: side === 'right' ? 1 : -1,
    };
  }
  const classes = RESIZE_HANDLE_SIDE_CLASSES[side];
  // У фото и заметки рукоятка компактнее, чем у задачи.
  const compact = cornerStyle === 'square' || cornerStyle === 'photo';
  return {
    backgroundClass: `inset-0 ${getResizeHandleRoundedClass(side === 'top' ? 'left' : 'right', cornerStyle)}`,
    gripClass: `left-1/2 -translate-x-1/2 ${compact ? classes.gripCompact : classes.grip} flex flex-row gap-px`,
    gripLineClass: `task-bar-resize-grip-line--vertical h-0.5 ${compact ? 'w-2' : 'w-3'}`,
    hitClass: `left-0 right-0 ${classes.edge} ${compact ? 'h-4' : 'h-6'} cursor-ns-resize`,
    hitOverhangClass: null,
    nudgeAxis: 'y',
    nudgeDirection: side === 'bottom' ? 1 : -1,
  };
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

interface TaskBarResizeHandleInlinePaint {
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
