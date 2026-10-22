'use client';

/**
 * Ячейка таймлайна: визуал part-разделителя и hit-zone quick-add.
 * Droppable регистрируется на уровне полосы (`swimlane-${id}`), hit-test ячейки —
 * геометрией в `calculateCellFromDragEvent` (без сотен useDroppable на pointermove).
 */

import { CARD_MARGIN, ZIndex, getPartsPerDay } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { useDelayedSwimlaneQuickAddHover } from '@/features/swimlane/hooks/useDelayedSwimlaneQuickAddHover';
import { clampSwimlaneQuickAddBandBox } from '@/features/swimlane/utils/swimlaneCellOccupancy';
import { computeSwimlaneRowBandBox } from '@/features/swimlane/utils/taskLayerTaskLayout';

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
  hasTaskOverlaps?: boolean;
  /** Скрыть part-разделитель (внутри интервала занятости). */
  hidePartDivider?: boolean;
  /** Part-разделители видны только во время перетаскивания: в покое доска без мелкой сетки. */
  partDividerVisible?: boolean;
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
  hidePartDivider = false,
  partDividerVisible = true,
  partIndex,
  partStatus,
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
}: DroppableCellProps) {
  const { t } = useI18n();
  const isQuickAddEnabled = Boolean(onQuickAddClick);
  const quickAddHover = useDelayedSwimlaneQuickAddHover(isQuickAddEnabled, onQuickAddHoverChange);

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
  const showPartDivider =
    !hidePartDivider && partIndex !== getPartsPerDay() - 1;

  return (
    <div
      className={`relative z-[1] flex-1 overflow-visible pointer-events-auto ${
        showPartDivider
          ? `border-r transition-colors duration-200 ${
              partDividerVisible
                ? 'border-gray-200/70 dark:border-gray-600/50'
                : 'border-transparent'
            }`
          : ''
      } ${onQuickAddClick ? 'cursor-pointer' : ''}`}
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
