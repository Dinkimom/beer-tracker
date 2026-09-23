'use client';

import type { Task } from '@/types';

import { useDroppable } from '@dnd-kit/core';

import { CARD_MARGIN, ZIndex, getPartsPerDay } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { useDelayedSwimlaneQuickAddHover } from '@/features/swimlane/hooks/useDelayedSwimlaneQuickAddHover';
import { clampSwimlaneQuickAddBandBox } from '@/features/swimlane/utils/swimlaneCellOccupancy';
import { computeSwimlaneRowBandBox } from '@/features/swimlane/utils/taskLayerTaskLayout';
import { getStatusColors, resolvePaletteStatusKey } from '@/utils/statusColors';

function resolveQuickAddHitBox(durationCells: number): {
  left: string;
  right: string;
  width?: string;
  zIndex: number;
} {
  const margin = `${CARD_MARGIN}px`;
  if (durationCells <= 1) {
    return { left: margin, right: margin, zIndex: ZIndex.contentInteractive };
  }
  return {
    left: margin,
    right: 'auto',
    width: `calc(${durationCells * 100}% - ${CARD_MARGIN * 2}px)`,
    zIndex: ZIndex.contentInteractive,
  };
}

interface DroppableCellProps {
  activeTask: Task | null;
  /** В ячейке есть событие отсутствия (отпуск, больничный и т.д.) */
  hasAvailabilityEvent?: boolean;
  hasTaskOverlaps?: boolean;
  id: string;
  isHighlighted: boolean;
  /** Ячейка попадает в нерабочий/праздничный день */
  isHoliday?: boolean;
  partIndex: number;
  partStatus: 'current' | 'future' | 'past';
  /** Не даёт превью «+» вылезти за высоту строки (фото/новый слой) */
  quickAddClipHeight?: number;
  /** Ширина хита в клетках — как у превью (фото 2). */
  quickAddDurationCells?: number;
  /** Слой превью «+»: свободный слот или новый слой ниже занятой ячейки */
  quickAddLayer?: number;
  quickAddLayerSpan?: number;
  /** Высота зоны задач — для выравнивания превью «+» с TaskBar */
  taskAreaHeight: number;
  taskLayerHeight?: number;
  totalHeight: number;
  onQuickAddClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onQuickAddHoverChange?: (hovered: boolean) => void;
}

export function DroppableCell({
  id,
  isHighlighted,
  partIndex,
  partStatus,
  activeTask,
  taskAreaHeight,
  hasTaskOverlaps = false,
  quickAddClipHeight,
  quickAddDurationCells = 1,
  quickAddLayer = 0,
  quickAddLayerSpan = 1,
  totalHeight,
  taskLayerHeight,
  onQuickAddClick,
  onQuickAddHoverChange,
  isHoliday,
  hasAvailabilityEvent = false,
}: DroppableCellProps) {
  const { setNodeRef } = useDroppable({ id });
  const { t } = useI18n();
  const isQuickAddEnabled = Boolean(onQuickAddClick);
  const quickAddHover = useDelayedSwimlaneQuickAddHover(isQuickAddEnabled, onQuickAddHoverChange);

  const getHighlightColor = () => {
    if (!activeTask) return { bg: 'bg-blue-100/80 dark:bg-blue-900/40', border: 'border-blue-300/50 dark:border-blue-700/50' };

    const statusColors = getStatusColors(
      resolvePaletteStatusKey(activeTask.originalStatus, activeTask.statusColorKey)
    );
    // Используем темные варианты для highlight, если они есть
    if (statusColors.highlightDark) {
      return {
        bg: `${statusColors.highlight.bg} ${statusColors.highlightDark.bg}`,
        border: `${statusColors.highlight.border} ${statusColors.highlightDark.border}`
      };
    }
    // Fallback: используем bgDark и borderDark для создания highlightDark
    const bgDark = statusColors.bgDark ? statusColors.bgDark.replace('dark:', '').replace('/40', '/40') : 'dark:bg-gray-700/40';
    const borderDark = statusColors.borderDark ? `${statusColors.borderDark.replace('dark:', '').replace('border-', 'border-')  }/50` : 'dark:border-gray-600/50';

    return {
      bg: `${statusColors.highlight.bg} dark:${bgDark}`,
      border: `${statusColors.highlight.border} dark:${borderDark}`
    };
  };

  const getBaseBgColor = () => {
    if (isHighlighted) {
      const highlightColor = getHighlightColor();
      return `${highlightColor.bg} ${highlightColor.border}`;
    }
    // Не используем useDroppable().isOver для фона: после drop dnd-kit часто оставляет isOver,
    // из‑за чего ячейки остаются закрашенными до движения мыши.

    if (partStatus === 'current' && !hasAvailabilityEvent) {
      return 'bg-blue-100/70 dark:bg-blue-900/30';
    }
    if (isHoliday) return 'bg-gray-50 dark:bg-gray-900/40';
    return '';
  };

  const quickAddBandStyle =
    onQuickAddClick != null
      ? clampSwimlaneQuickAddBandBox(
          computeSwimlaneRowBandBox(
            hasTaskOverlaps,
            quickAddLayer,
            taskAreaHeight,
            taskLayerHeight ?? taskAreaHeight,
            quickAddLayerSpan
          ),
          quickAddClipHeight ?? taskAreaHeight
        )
      : null;

  const isQuickAddVisible = Boolean(onQuickAddClick && quickAddBandStyle && quickAddHover.isHovered);

  return (
    <div
      ref={setNodeRef}
      className={`relative flex-1 overflow-visible pointer-events-auto ${
        partIndex !== getPartsPerDay() - 1 ? 'border-r border-gray-200/50 dark:border-gray-600/50' : ''
      } ${onQuickAddClick ? 'cursor-pointer' : ''} ${getBaseBgColor()}`}
      data-current-cell={partStatus === 'current' ? 'true' : undefined}
      style={{ height: `${totalHeight}px`, minHeight: `${totalHeight}px` }}
      onMouseEnter={quickAddHover.onPointerEnter}
      onMouseLeave={quickAddHover.onPointerLeave}
      onMouseMove={quickAddHover.onPointerEnter}
    >
      {onQuickAddClick && quickAddBandStyle ? (
        <button
          aria-label={t('sprintPlanner.occupancy.addTaskButton')}
          className={`absolute flex cursor-pointer items-center justify-center rounded-lg border-2 border-transparent bg-transparent ${
            isQuickAddVisible
              ? 'pointer-events-auto'
              : 'pointer-events-none'
          }`}
          data-swimlane-cell-quick-add
          style={{
            ...quickAddBandStyle,
            ...resolveQuickAddHitBox(quickAddDurationCells),
          }}
          type="button"
          onClick={(event) => {
            onQuickAddClick(event);
          }}
        />
      ) : null}
    </div>
  );
}
