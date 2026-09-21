'use client';

import { useI18n } from '@/contexts/LanguageContext';

interface SwimlaneRowBorderResizeHandleProps {
  isBorderHovered: boolean;
  isResizing: boolean;
  onMouseDown: (event: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export function resolveSwimlaneRowResizeHandleShellClass(isActive: boolean): string {
  if (isActive) {
    return 'pointer-events-auto opacity-100';
  }
  return 'pointer-events-auto opacity-0 group-hover:opacity-100';
}

/** Одна высота подсветки на колонке исполнителя и между строками. */
export const SWIMLANE_ROW_RESIZE_HIGHLIGHT_STRIP_CLASS =
  'absolute inset-x-0 bottom-0 h-1.5 overflow-hidden';

/** Как SidebarResizeHandle: при нажатии bg-blue-500 + светлый оверлей. */
export function resolveSwimlaneRowResizeHandleStripClass(
  isResizing: boolean,
  isBorderHovered: boolean
): string {
  if (isResizing) {
    return 'bg-blue-500 after:absolute after:inset-0 after:bg-blue-100/60 dark:after:bg-blue-900/40';
  }
  if (isBorderHovered) {
    return 'bg-blue-100/60 dark:bg-blue-900/40';
  }
  return 'bg-transparent';
}

export function resolveSwimlaneRowResizeHandleGripLineClass(isActive: boolean): string {
  if (isActive) {
    return 'bg-blue-600';
  }
  return 'bg-gray-400 dark:bg-gray-500';
}

export function resolveSwimlaneRowResizeHighlightStripClass(
  isResizing: boolean,
  isBorderHovered: boolean
): string {
  return `${SWIMLANE_ROW_RESIZE_HIGHLIGHT_STRIP_CLASS} transition-colors duration-200 ${resolveSwimlaneRowResizeHandleStripClass(isResizing, isBorderHovered)}`;
}

/**
 * Ручка высоты строки на колонке исполнителя — тот же паттерн, что у сайдбара:
 * тонкая полоска по краю и компактный грип, а не карточка на таймлайне.
 */
export function SwimlaneRowBorderResizeHandle({
  isBorderHovered,
  isResizing,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
}: SwimlaneRowBorderResizeHandleProps) {
  const { t } = useI18n();
  const label = t('sprintPlanner.swimlane.resizeRowHeight');
  const isActive = isResizing || isBorderHovered;

  return (
    <div
      aria-label={label}
      className={`relative h-4 w-full cursor-ns-resize ${resolveSwimlaneRowResizeHandleShellClass(isActive)}`}
      data-swimlane-row-border-resize
      role="separator"
      tabIndex={-1}
      title={label}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={resolveSwimlaneRowResizeHighlightStripClass(isResizing, isBorderHovered)} />
      <div className="pointer-events-none absolute bottom-0.5 left-1/2 flex -translate-x-1/2 flex-row gap-0.5">
        {[1, 2, 3].map((line) => (
          <div
            key={line}
            className={`h-0.5 w-3 rounded-full transition-colors duration-200 ${resolveSwimlaneRowResizeHandleGripLineClass(isActive)}`}
          />
        ))}
      </div>
    </div>
  );
}
