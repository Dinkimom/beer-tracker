'use client';

import type { SegmentEditGap, SegmentEditGapDragMode } from '@/features/swimlane/hooks/useSegmentEditGapDrag';
import type { PhaseSegment } from '@/types';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { CARD_MARGIN, WORKING_DAYS, ZIndex, getPartsPerDay } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import {
  CARD_FLOATING_TOOLBAR_CANCEL_BUTTON_CLASS,
  CARD_FLOATING_TOOLBAR_CONFIRM_BUTTON_CLASS,
  CardFloatingToolbar,
  handleCardFloatingToolbarActionClick,
} from '@/features/context-menu/components/CardFloatingToolbar';
import { isPlannerHistoryShortcutBlockedTarget } from '@/features/sprint/components/SprintPlanner/components/plannerHistoryKeyboard';
import { SwimlaneSegmentEditGap } from '@/features/swimlane/components/SwimlaneSegmentEditGap';
import {
  applySegmentEditGapChange,
  useSegmentEditGapDrag,
} from '@/features/swimlane/hooks/useSegmentEditGapDrag';
import {
  cellsToSegments,
  insertSegmentGapAfter,
  listSegmentGapBlocks,
  listSegmentSplitPoints,
  nearestSegmentSplitPoint,
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

/** Курсор прилипает к границе ячеек не дальше одной ячейки. */
const CUT_SNAP_MAX_CELLS = 1;

/** Постоянные метки разреза на границах дней — видно, что карточку можно резать. */
const DAY_SPLIT_HIT_CLASS =
  'absolute top-0 bottom-0 z-[2] flex w-3.5 -translate-x-1/2 cursor-pointer items-stretch justify-center rounded-sm border-0 bg-transparent p-0 transition-colors duration-200 hover:bg-blue-500/15 active:bg-blue-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-blue-400/20 dark:active:bg-blue-400/30 dark:focus-visible:ring-blue-400';

const DAY_SPLIT_LINE_CLASS =
  'pointer-events-none h-full w-0 border-l border-dashed border-blue-500/50 dark:border-blue-400/50';

/** Зона «резать где угодно» поверх отрезков: клик — разрез в ближайшей границе ячеек. */
const CUT_ZONE_CLASS = 'absolute top-0 bottom-0 z-[1] cursor-pointer border-0 bg-transparent p-0';

const CUT_GUIDE_LINE_CLASS =
  'pointer-events-none absolute top-0 bottom-0 z-[3] w-0 -translate-x-px border-l-2 border-dashed border-blue-600 dark:border-blue-300';

const CUT_GUIDE_CHIP_CLASS =
  'absolute left-0 top-1/2 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm dark:bg-blue-500';

/** Клик мышью не уводит фокус на контрол: иначе Enter после клика не сохранит правку. */
function keepFocusOnMouseDown(event: React.MouseEvent): void {
  event.preventDefault();
}

function isBlockingDialogOpen(): boolean {
  return document.querySelector('[data-confirm-dialog="true"]') != null;
}

/**
 * Режим редактирования отрезков: разрезы и разрывы между отрезками
 * (сумма рабочих ячеек не меняется); карточки остаются под слоем.
 * Клик по карточке режет, разрыв тянется (тело — сдвиг, правый край — длина), Enter/Esc.
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
  const { language, t } = useI18n();
  const layerRef = useRef<HTMLDivElement>(null);
  const [hoveredSplitAfter, setHoveredSplitAfter] = useState<number | null>(null);
  const [hoveredGapOrdinal, setHoveredGapOrdinal] = useState<number | null>(null);

  const partsPerDay = getPartsPerDay();
  const hasDraftChanges = useMemo(() => phaseSegmentCellsDirty(cells, initialCells), [cells, initialCells]);
  const maxLength = Math.max(0, timelineTotalParts - rangeStartCell);
  const canInsertGap = cells.length < maxLength;
  const splitPoints = useMemo(() => listSegmentSplitPoints(cells), [cells]);
  const gapBlocks = useMemo(() => listSegmentGapBlocks(cells), [cells]);
  const daySplitPoints = useMemo(
    () => splitPoints.filter((afterIndex) => (rangeStartCell + afterIndex + 1) % partsPerDay === 0),
    [partsPerDay, rangeStartCell, splitPoints]
  );
  const dayFormat = useMemo(
    () => new Intl.NumberFormat(language, { maximumFractionDigits: 2 }),
    [language]
  );

  const getCellWidthPx = useCallback(() => {
    const width = layerRef.current?.getBoundingClientRect().width ?? 0;
    return width / timelineTotalParts;
  }, [timelineTotalParts]);

  const { consumeDragClick, draggingGapOrdinal, startGapDrag } = useSegmentEditGapDrag({
    cells,
    getCellWidthPx,
    maxLength,
    onCellsChange,
  });

  const leftPercent = (rangeStartCell / timelineTotalParts) * 100;
  const widthPercent = (cells.length / timelineTotalParts) * 100;
  const barLeft = `calc(${leftPercent}% + ${CARD_MARGIN}px)`;
  const barWidth = `calc(${widthPercent}% - ${CARD_MARGIN * 2}px)`;

  const cutGuideSplit =
    canInsertGap &&
    draggingGapOrdinal == null &&
    hoveredSplitAfter != null &&
    splitPoints.includes(hoveredSplitAfter)
      ? hoveredSplitAfter
      : null;

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

  const handleNudgeGap = useCallback(
    (gap: SegmentEditGap, mode: SegmentEditGapDragMode, delta: number) => {
      const next = applySegmentEditGapChange(mode, cells, gap, delta, maxLength);
      if (next) onCellsChange(next);
    },
    [cells, maxLength, onCellsChange]
  );

  const handleConfirm = useCallback(() => {
    const segments = cellsToSegments(rangeStartCell, cells);
    const allOn = cells.every(Boolean);
    onSave(allOn ? [] : segments);
    onCancel();
  }, [cells, rangeStartCell, onSave, onCancel]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        isPlannerHistoryShortcutBlockedTarget(event.target) ||
        isBlockingDialogOpen()
      ) {
        return;
      }
      if (event.key === 'Escape') {
        // Capture + stopImmediatePropagation: Esc закрывает редактор, а не сбрасывает инструмент тулбара.
        event.preventDefault();
        event.stopImmediatePropagation();
        onCancel();
        return;
      }
      const fromButton = event.target instanceof Element && event.target.closest('button') != null;
      if (event.key === 'Enter' && hasDraftChanges && !fromButton) {
        event.preventDefault();
        handleConfirm();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [handleConfirm, hasDraftChanges, onCancel]);

  const cellLeftPercent = (cellOffset: number) =>
    ((rangeStartCell + cellOffset) / timelineTotalParts) * 100;

  const splitPointAtClientX = (clientX: number): number | null => {
    const rect = layerRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) {
      return null;
    }
    const offset = ((clientX - rect.left) / rect.width) * timelineTotalParts - rangeStartCell;
    return nearestSegmentSplitPoint(splitPoints, offset, CUT_SNAP_MAX_CELLS);
  };

  const confirmTitle = `${t('sprintPlanner.occupancy.segmentEditorConfirmTitle')} · Enter`;
  const discardTitle = `${t('sprintPlanner.occupancy.segmentEditorDiscardTitle')} · Esc`;

  return (
    <>
      {/* Обводка — под карточками (кольцо снаружи их границ), чтобы не перекрывать значки отрезков. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 right-0"
        style={{ ...containerStyle, zIndex: ZIndex.stickyInContent - 1 }}
      >
        <div
          className={`absolute rounded-lg ${PHASE_FOCUS_RING_SOURCE}`}
          style={{ left: barLeft, width: barWidth, top: 0, bottom: 0 }}
        />
      </div>
      <div className="pointer-events-auto absolute left-0 right-0" style={containerStyle}>
        {/* Тулбар — как у карточек (с CARD_MARGIN). */}
        <div className="absolute" style={{ left: barLeft, width: barWidth, top: 0, bottom: 0 }}>
          <CardFloatingToolbar data-swimlane-segment-edit-toolbar="">
            <span className="select-none px-1.5 text-[11px] leading-none text-gray-500 dark:text-gray-400">
              {t('sprintPlanner.occupancy.segmentEditorHint')}
            </span>
            <Button
              aria-label={confirmTitle}
              className={CARD_FLOATING_TOOLBAR_CONFIRM_BUTTON_CLASS}
              disabled={!hasDraftChanges}
              title={confirmTitle}
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
              aria-label={discardTitle}
              className={CARD_FLOATING_TOOLBAR_CANCEL_BUTTON_CLASS}
              title={discardTitle}
              type="button"
              variant="ghost"
              onClick={(event) => handleCardFloatingToolbarActionClick(event, onCancel)}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <Icon className="h-3.5 w-3.5" name="x" />
            </Button>
          </CardFloatingToolbar>
        </div>
        {/* Разрезы и разрывы — по абсолютным границам ячеек сетки (без смещения CARD_MARGIN). */}
        <div
          ref={layerRef}
          className="absolute inset-0 z-[1]"
          onMouseLeave={() => {
            setHoveredSplitAfter(null);
            setHoveredGapOrdinal(null);
          }}
        >
          {canInsertGap ? (
            <button
              aria-hidden
              className={CUT_ZONE_CLASS}
              style={{ left: `${cellLeftPercent(0)}%`, width: `${widthPercent}%` }}
              tabIndex={-1}
              type="button"
              onClick={(event) => {
                // Точка — по координате клика: hover-состояние могло не успеть обновиться.
                const afterIndex = splitPointAtClientX(event.clientX);
                if (afterIndex != null) handleInsertGap(afterIndex);
              }}
              onMouseDown={keepFocusOnMouseDown}
              onPointerDown={(event) => event.stopPropagation()}
              onPointerMove={(event) => setHoveredSplitAfter(splitPointAtClientX(event.clientX))}
            />
          ) : null}
          {canInsertGap
            ? daySplitPoints.map((afterIndex) => (
                <button
                  key={`split-${afterIndex}`}
                  aria-label={t('sprintPlanner.occupancy.segmentGapAdd')}
                  className={DAY_SPLIT_HIT_CLASS}
                  style={{ left: `${cellLeftPercent(afterIndex + 1)}%` }}
                  title={t('sprintPlanner.occupancy.segmentGapAdd')}
                  type="button"
                  onBlur={() => setHoveredSplitAfter(null)}
                  onClick={() => handleInsertGap(afterIndex)}
                  onFocus={() => setHoveredSplitAfter(afterIndex)}
                  onMouseDown={keepFocusOnMouseDown}
                  onMouseEnter={() => setHoveredSplitAfter(afterIndex)}
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <span aria-hidden className={DAY_SPLIT_LINE_CLASS} />
                </button>
              ))
            : null}
          {gapBlocks.map((gap, ordinal) => (
            <SwimlaneSegmentEditGap
              // Ключ по порядковому номеру: при сдвиге startIndex меняется, а drag не должен терять элемент.
              key={`gap-${ordinal}`}
              active={draggingGapOrdinal === ordinal || hoveredGapOrdinal === ordinal}
              leftPercent={cellLeftPercent(gap.startIndex)}
              lengthLabel={t('sprintPlanner.occupancy.segmentGapLength', {
                days: dayFormat.format(gap.length / partsPerDay),
              })}
              widthPercent={(gap.length / timelineTotalParts) * 100}
              onDragStart={(event, mode) => startGapDrag(event, gap, ordinal, mode)}
              onHoverChange={(hovered) => {
                setHoveredGapOrdinal(hovered ? ordinal : null);
                if (hovered) setHoveredSplitAfter(null);
              }}
              onNudge={(mode, delta) => handleNudgeGap(gap, mode, delta)}
              onRemoveClick={() => {
                if (!consumeDragClick()) handleRemoveGap(gap.startIndex);
              }}
              onResizeHandleClick={consumeDragClick}
            />
          ))}
          {cutGuideSplit != null ? (
            <div aria-hidden className={CUT_GUIDE_LINE_CLASS} style={{ left: `${cellLeftPercent(cutGuideSplit + 1)}%` }}>
              <span className={CUT_GUIDE_CHIP_CLASS}>
                <Icon className="h-3 w-3" name="scissors" />
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
