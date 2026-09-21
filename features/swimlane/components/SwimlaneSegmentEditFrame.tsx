'use client';

import type { PhaseSegment } from '@/types';

import { useCallback, useMemo, useState } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { CARD_MARGIN, WORKING_DAYS, PARTS_PER_DAY } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { cellsToSegments, PHASE_FOCUS_RING_SOURCE, phaseSegmentCellsDirty } from '@/lib/planner-timeline';

interface SwimlaneSegmentEditFrameProps {
  cells: boolean[];
  /** Вертикальные отступы строки (как у TaskBar): top, bottom, zIndex */
  containerStyle: React.CSSProperties;
  /** Исходные ячейки при входе в редактор — для кнопки «Подтвердить» и отката */
  initialCells: boolean[];
  rangeStartCell: number;
  /** Знаменатель для процентов по ширине таймлайна */
  timelineTotalParts?: number;
  totalCells: number;
  onCancel: () => void;
  onCellsChange: (next: boolean[]) => void;
  onSave: (segments: PhaseSegment[]) => void;
}

/**
 * Режим редактирования отрезков на свимлейне: обводка вокруг полного диапазона (с зазорами)
 * и невидимые кнопки по ячейкам; карточки остаются под слоем.
 */
export function SwimlaneSegmentEditFrame({
  cells,
  initialCells,
  onCellsChange,
  rangeStartCell,
  timelineTotalParts = WORKING_DAYS * PARTS_PER_DAY,
  totalCells,
  containerStyle,
  onSave,
  onCancel,
}: SwimlaneSegmentEditFrameProps) {
  const { t } = useI18n();
  const [hoveredCellIndex, setHoveredCellIndex] = useState<number | null>(null);

  const hasDraftChanges = useMemo(() => phaseSegmentCellsDirty(cells, initialCells), [cells, initialCells]);

  const leftPercent = (rangeStartCell / timelineTotalParts) * 100;
  const widthPercent = (totalCells / timelineTotalParts) * 100;
  const barLeft = `calc(${leftPercent}% + ${CARD_MARGIN}px)`;
  const barWidth = `calc(${widthPercent}% - ${CARD_MARGIN * 2}px)`;
  /** Как у PhaseSegmentInlineEditor / OccupancyLinkButton: левый край контейнера кнопки — правый край диапазона по сетке */
  const cancelButtonContainerLeft = `calc(${leftPercent}% + ${widthPercent}%)`;

  const toggle = useCallback(
    (index: number) => {
      const next = [...cells];
      next[index] = !cells[index];
      onCellsChange(next);
    },
    [cells, onCellsChange],
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

  return (
    <div className="pointer-events-auto absolute left-0 right-0" style={containerStyle}>
      <div
        aria-hidden
        className={`pointer-events-none absolute rounded-lg ${PHASE_FOCUS_RING_SOURCE}`}
        style={{ left: barLeft, width: barWidth, top: 0, bottom: 0, zIndex: 0 }}
      />
      {/* Как в PhaseSegmentInlineEditor (занятость): скругление + overflow-hidden, сырые button без ghost — иначе «дырка» и лишний контраст ховера */}
      <div
        className="absolute z-[1] flex items-stretch overflow-hidden rounded-lg"
        style={{ left: barLeft, width: barWidth, top: 0, bottom: 0 }}
        onMouseLeave={() => setHoveredCellIndex(null)}
      >
        {cells.map((on, idx) => (
          <button
            key={idx}
            aria-label={on ? 'Выключить отрезок' : 'Включить отрезок'}
            className={`min-h-0 min-w-0 flex-1 cursor-pointer rounded-sm border-0 transition-colors ${
              hoveredCellIndex === idx
                ? 'bg-black/15 ring-1 ring-inset ring-black/25 dark:bg-white/15 dark:ring-white/30'
                : 'bg-transparent hover:bg-black/10 dark:hover:bg-white/5'
            }`}
            title={on ? 'Выключить отрезок' : 'Включить отрезок'}
            type="button"
            onClick={() => toggle(idx)}
            onMouseEnter={() => setHoveredCellIndex(idx)}
          />
        ))}
      </div>
      <div
        className="pointer-events-auto absolute flex items-center justify-end gap-1 pl-1"
        style={{
          left: cancelButtonContainerLeft,
          top: 0,
          bottom: 0,
          zIndex: 2,
        }}
      >
        {hasDraftChanges ? (
          <Button
            aria-label={t('sprintPlanner.occupancy.segmentEditorConfirmTitle')}
            className="!h-6 !w-6 !min-h-0 !min-w-0 !justify-center !p-0 text-green-700/90 transition-colors duration-200 focus-visible:outline-none dark:text-green-400/90 !border-gray-200/60 !bg-gray-50/80 !shadow-none hover:!border-green-600/25 hover:!bg-green-500/[0.12] hover:!shadow-sm dark:!border-gray-600/45 dark:!bg-gray-800/45 dark:hover:!border-green-400/30 dark:hover:!bg-green-400/[0.12]"
            title={t('sprintPlanner.occupancy.segmentEditorConfirmTitle')}
            type="button"
            variant="outline"
            onClick={handleConfirm}
          >
            <Icon className="h-3.5 w-3.5" name="check" />
          </Button>
        ) : null}
        <Button
          aria-label={t('sprintPlanner.occupancy.segmentEditorDiscardTitle')}
          className="!h-6 !w-6 !min-h-0 !min-w-0 !justify-center !p-0 text-red-600/90 transition-colors duration-200 focus-visible:outline-none dark:text-red-400/90 !border-gray-200/60 !bg-gray-50/80 !shadow-none hover:!border-red-600/25 hover:!bg-red-500/[0.1] hover:!shadow-sm dark:!border-gray-600/45 dark:!bg-gray-800/45 dark:hover:!border-red-400/30 dark:hover:!bg-red-400/[0.1]"
          title={t('sprintPlanner.occupancy.segmentEditorDiscardTitle')}
          type="button"
          variant="outline"
          onClick={handleDiscard}
        >
          <Icon className="h-3.5 w-3.5" name="x" />
        </Button>
      </div>
    </div>
  );
}
