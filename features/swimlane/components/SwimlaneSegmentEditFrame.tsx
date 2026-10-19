'use client';

import type { PhaseSegment } from '@/types';

import { useCallback, useMemo, useState } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { CARD_MARGIN, WORKING_DAYS, getPartsPerDay } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import {
  CARD_FLOATING_TOOLBAR_CANCEL_BUTTON_CLASS,
  CARD_FLOATING_TOOLBAR_CONFIRM_BUTTON_CLASS,
  CardFloatingToolbar,
  handleCardFloatingToolbarActionClick,
} from '@/features/context-menu/components/CardFloatingToolbar';
import {
  cellsToSegments,
  insertSegmentGapAfter,
  listSegmentGapBlocks,
  listSegmentSplitPoints,
  PHASE_FOCUS_RING_SOURCE,
  phaseSegmentCellsDirty,
  removeSegmentGapBlock,
} from '@/lib/planner-timeline';

interface SwimlaneSegmentEditFrameProps {
  cells: boolean[];
  /** Вертикальные отступы строки (как у TaskBar): top, bottom, zIndex */
  containerStyle: React.CSSProperties;
  /** Исходные ячейки при входе в редактор — для кнопки «Подтвердить» и отката */
  initialCells: boolean[];
  rangeStartCell: number;
  /** Знаменатель для процентов по ширине таймлайна */
  timelineTotalParts?: number;
  onCancel: () => void;
  onCellsChange: (next: boolean[]) => void;
  onSave: (segments: PhaseSegment[]) => void;
}

/** Цвет как у PHASE_FOCUS_RING_SOURCE (`ring-blue-500` / `dark:ring-blue-400`). */
const RING_LINE =
  'border-blue-500 dark:border-blue-400';
const RING_LINE_HOVER =
  'border-blue-600 dark:border-blue-300';
const RING_HATCH =
  'bg-[repeating-linear-gradient(-45deg,transparent,transparent_3px,rgb(59_130_246/0.28)_3px,rgb(59_130_246/0.28)_6px)] dark:bg-[repeating-linear-gradient(-45deg,transparent,transparent_3px,rgb(96_165_250/0.32)_3px,rgb(96_165_250/0.32)_6px)]';
const RING_HATCH_HOVER =
  'bg-[repeating-linear-gradient(-45deg,transparent,transparent_3px,rgb(59_130_246/0.42)_3px,rgb(59_130_246/0.42)_6px)] dark:bg-[repeating-linear-gradient(-45deg,transparent,transparent_3px,rgb(96_165_250/0.48)_3px,rgb(96_165_250/0.48)_6px)]';

/** Hit-зона вокруг вертикального пунктира (добавить разрыв). */
const SPLIT_HIT_CLASS =
  'absolute top-0 bottom-0 z-[2] flex w-3.5 -translate-x-1/2 cursor-pointer items-stretch justify-center border-0 bg-transparent p-0 transition-colors duration-200 hover:bg-blue-500/15 dark:hover:bg-blue-400/20 active:bg-blue-500/25 dark:active:bg-blue-400/30';

const SPLIT_LINE_CLASS = `pointer-events-none h-full w-0 border-l-2 border-dashed ${RING_LINE} transition-[border-color] duration-200`;

const GAP_HIT_CLASS =
  'absolute top-0 bottom-0 z-[1] cursor-pointer rounded-sm border-0 p-0 transition-colors duration-200 active:scale-[0.99]';

const GAP_EDGE_LINE_CLASS = `pointer-events-none absolute top-0 bottom-0 w-0 border-l-2 border-dashed ${RING_LINE} transition-[border-color] duration-200`;

/**
 * Режим редактирования отрезков: раздвижка сегментов разрывами
 * (сумма рабочих ячеек не меняется); карточки остаются под слоем.
 */
export function SwimlaneSegmentEditFrame({
  cells,
  initialCells,
  onCellsChange,
  rangeStartCell,
  timelineTotalParts = WORKING_DAYS * getPartsPerDay(),
  containerStyle,
  onSave,
  onCancel,
}: SwimlaneSegmentEditFrameProps) {
  const { t } = useI18n();
  const [hoveredSplitAfter, setHoveredSplitAfter] = useState<number | null>(null);
  const [hoveredGapStart, setHoveredGapStart] = useState<number | null>(null);

  const hasDraftChanges = useMemo(() => phaseSegmentCellsDirty(cells, initialCells), [cells, initialCells]);
  const maxLength = Math.max(0, timelineTotalParts - rangeStartCell);
  const canInsertGap = cells.length < maxLength;
  const splitPoints = useMemo(() => listSegmentSplitPoints(cells), [cells]);
  const gapBlocks = useMemo(() => listSegmentGapBlocks(cells), [cells]);

  const leftPercent = (rangeStartCell / timelineTotalParts) * 100;
  const widthPercent = (cells.length / timelineTotalParts) * 100;
  const barLeft = `calc(${leftPercent}% + ${CARD_MARGIN}px)`;
  const barWidth = `calc(${widthPercent}% - ${CARD_MARGIN * 2}px)`;

  const handleInsertGap = useCallback(
    (afterIndex: number) => {
      const next = insertSegmentGapAfter(cells, afterIndex, maxLength);
      if (next) onCellsChange(next);
    },
    [cells, maxLength, onCellsChange]
  );

  const handleRemoveGap = useCallback(
    (indexInGap: number) => {
      const next = removeSegmentGapBlock(cells, indexInGap);
      if (next) onCellsChange(next);
    },
    [cells, onCellsChange]
  );

  const handleConfirm = useCallback(() => {
    const segments = cellsToSegments(rangeStartCell, cells);
    const allOn = cells.every(Boolean);
    onSave(allOn ? [] : segments);
    onCancel();
  }, [cells, rangeStartCell, onSave, onCancel]);

  const handleDiscard = useCallback(() => {
    onCancel();
  }, [onCancel]);

  const cellLeftPercent = (cellOffset: number) =>
    ((rangeStartCell + cellOffset) / timelineTotalParts) * 100;

  return (
    <div className="pointer-events-auto absolute left-0 right-0" style={containerStyle}>
      {/* Обводка и тулбар — как у карточек (с CARD_MARGIN). */}
      <div className="absolute" style={{ left: barLeft, width: barWidth, top: 0, bottom: 0 }}>
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 rounded-lg ${PHASE_FOCUS_RING_SOURCE}`}
        />
        <CardFloatingToolbar data-swimlane-segment-edit-toolbar="">
          <Button
            aria-label={t('sprintPlanner.occupancy.segmentEditorConfirmTitle')}
            className={CARD_FLOATING_TOOLBAR_CONFIRM_BUTTON_CLASS}
            disabled={!hasDraftChanges}
            title={t('sprintPlanner.occupancy.segmentEditorConfirmTitle')}
            type="button"
            variant="ghost"
            onClick={(event) =>
              handleCardFloatingToolbarActionClick(
                event,
                hasDraftChanges ? handleConfirm : undefined
              )
            }
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Icon className="h-3.5 w-3.5" name="check" />
          </Button>
          <Button
            aria-label={t('sprintPlanner.occupancy.segmentEditorDiscardTitle')}
            className={CARD_FLOATING_TOOLBAR_CANCEL_BUTTON_CLASS}
            title={t('sprintPlanner.occupancy.segmentEditorDiscardTitle')}
            type="button"
            variant="ghost"
            onClick={(event) => handleCardFloatingToolbarActionClick(event, handleDiscard)}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Icon className="h-3.5 w-3.5" name="x" />
          </Button>
        </CardFloatingToolbar>
      </div>
      {/* Линии разрыва — по абсолютным границам ячеек сетки (без смещения CARD_MARGIN). */}
      <div
        className="absolute inset-0 z-[1]"
        onMouseLeave={() => {
          setHoveredSplitAfter(null);
          setHoveredGapStart(null);
        }}
      >
        {gapBlocks.map((gap) => {
          const leftPct = cellLeftPercent(gap.startIndex);
          const widthPct = (gap.length / timelineTotalParts) * 100;
          const hovered = hoveredGapStart === gap.startIndex;
          return (
            <button
              key={`gap-${gap.startIndex}`}
              aria-label={t('sprintPlanner.occupancy.segmentGapRemove')}
              className={`${GAP_HIT_CLASS} ${hovered ? RING_HATCH_HOVER : RING_HATCH}`}
              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
              type="button"
              onClick={() => handleRemoveGap(gap.startIndex)}
              onMouseEnter={() => setHoveredGapStart(gap.startIndex)}
            >
              <span
                aria-hidden
                className={`${GAP_EDGE_LINE_CLASS} left-0${hovered ? ` ${RING_LINE_HOVER}` : ''}`}
              />
              <span
                aria-hidden
                className={`${GAP_EDGE_LINE_CLASS} right-0 -translate-x-px${
                  hovered ? ` ${RING_LINE_HOVER}` : ''
                }`}
              />
            </button>
          );
        })}
        {canInsertGap
          ? splitPoints.map((afterIndex) => {
              const leftPct = cellLeftPercent(afterIndex + 1);
              const hovered = hoveredSplitAfter === afterIndex;
              return (
                <button
                  key={`split-${afterIndex}`}
                  aria-label={t('sprintPlanner.occupancy.segmentGapAdd')}
                  className={SPLIT_HIT_CLASS}
                  style={{ left: `${leftPct}%` }}
                  type="button"
                  onClick={() => handleInsertGap(afterIndex)}
                  onMouseEnter={() => setHoveredSplitAfter(afterIndex)}
                >
                  <span
                    aria-hidden
                    className={`${SPLIT_LINE_CLASS}${hovered ? ` ${RING_LINE_HOVER}` : ''}`}
                  />
                </button>
              );
            })
          : null}
      </div>
    </div>
  );
}
