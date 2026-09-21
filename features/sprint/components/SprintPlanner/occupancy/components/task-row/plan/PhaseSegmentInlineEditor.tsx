'use client';

import type { PhaseSegment } from '@/types';

import { useEffect, useMemo, useState } from 'react';

import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { usePhaseCardColorScheme } from '@/components/PhaseCardColorSchemeContext';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import {
  cellsToSegments,
  getPhaseSegmentCellBlocks,
  phaseSegmentCellsDirty,
} from '@/features/sprint/utils/occupancyUtils';
import { PHASE_FOCUS_RING_SOURCE } from '@/lib/planner-timeline';
import { getQaStripedStyles, resolveStatusForPhaseCardColors } from '@/utils/statusColors';

import {
  PHASE_BAR_HEIGHT_PX,
  PHASE_BAR_TOP_OFFSET_PX,
  PHASE_PLAN_ROW_INSET_PX,
} from './occupancyPhaseBarConstants';

interface PhaseSegmentInlineEditorProps {
  avatarUrl?: string | null;
  badgeClass?: string;
  barHeight?: number;
  barTopOffset?: number;
  /** Начальное состояние: включена ли каждая ячейка */
  initialCells: boolean[];
  initials: string;
  /** Фаза тестирования — рисуем штриховку как у реальных QA-фаз */
  isQa?: boolean;
  /** Статус задачи для цвета штриховки QA */
  originalStatus?: string;
  /** Начальная ячейка диапазона (для пересчёта в segments) */
  rangeStartCell: number;
  /** Override палитры (интеграция: visualToken) */
  statusColorKey?: string;
  teamBorder: string;
  /** Стиль фазы как в OccupancyPhaseBar; для QA при isQa используется штриховка */
  teamColor: string;
  /** Количество ячеек (квадратов) */
  totalCells: number;
  /** Всего ячеек таймлайна (для процентов позиции) */
  totalParts: number;
  onCancel: () => void;
  onSave: (segments: PhaseSegment[]) => void;
}

export function PhaseSegmentInlineEditor({
  rangeStartCell,
  totalCells,
  initialCells,
  totalParts,
  barHeight = PHASE_BAR_HEIGHT_PX,
  barTopOffset = PHASE_BAR_TOP_OFFSET_PX,
  teamColor,
  teamBorder,
  isQa = false,
  originalStatus,
  statusColorKey,
  avatarUrl,
  initials,
  badgeClass,
  onCancel,
  onSave,
}: PhaseSegmentInlineEditorProps) {
  const { t } = useI18n();
  const phaseCardColorScheme = usePhaseCardColorScheme();
  const [cells, setCells] = useState<boolean[]>(initialCells);
  const [hoveredCellIndex, setHoveredCellIndex] = useState<number | null>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  const hasDraftChanges = useMemo(() => phaseSegmentCellsDirty(cells, initialCells), [cells, initialCells]);

  const statusForColors = resolveStatusForPhaseCardColors(
    phaseCardColorScheme,
    originalStatus,
    statusColorKey
  );
  const qaStripedStyle = isQa ? getQaStripedStyles(statusForColors, isDark).style : undefined;
  const blocks = getPhaseSegmentCellBlocks(cells);

  const toggle = (index: number) => {
    const wasOn = cells[index];
    const nextCells = [...cells];
    nextCells[index] = !wasOn;
    // Во время редактирования не дергаем API и не считаем оценки —
    // просто обновляем локальное состояние. Все сохранение/переоценка
    // произойдет один раз при выходе из режима.
    setCells(nextCells);
  };
  const leftPercent = (rangeStartCell / totalParts) * 100;
  const widthPercent = (totalCells / totalParts) * 100;
  // Отступ по краям как у OccupancyPhaseBar: 6px слева и справа от границ ячеек
  const stripLeft = `calc(${leftPercent}% + ${PHASE_PLAN_ROW_INSET_PX}px)`;
  const stripWidth = `calc(${widthPercent}% - ${PHASE_PLAN_ROW_INSET_PX * 2}px)`;
  // Как у кнопки связей: контейнер w-8 (32px), justify-end — отступ от фазы совпадает с OccupancyLinkButton
  const cancelButtonContainerLeft = `calc(${leftPercent}% + ${widthPercent}%)`;

  const handleConfirm = () => {
    const segments = cellsToSegments(rangeStartCell, cells);
    const allOn = cells.every(Boolean);
    const effectiveSegments = allOn ? [] : segments;
    onSave(effectiveSegments);
    onCancel();
  };

  const handleDiscard = () => {
    onCancel();
  };

  const renderPhaseBlocks = (
    blockList: Array<{ type: 'off'; length: number } | { type: 'on'; length: number }>
  ) => {
    const onBlocks = blockList.filter((b): b is { type: 'on'; length: number } => b.type === 'on');
    return (
      <div className="flex flex-1 min-w-0 min-h-0 items-stretch h-full">
        {blockList.map((block, idx) =>
          block.type === 'on' ? (
            <div
              key={idx}
              className={`rounded-lg min-w-0 border-2 ${qaStripedStyle ? '' : teamColor} ${teamBorder} flex items-center justify-center shrink-0`}
              style={{ flex: `${block.length} 0 0`, ...(qaStripedStyle ?? {}) }}
            >
              {onBlocks.length >= 1 && (
                <Avatar
                  avatarUrl={avatarUrl}
                  initials={initials}
                  initialsClassName={badgeClass ?? 'bg-gray-500 dark:bg-gray-600 text-white border-gray-600 dark:border-gray-700'}
                  size={onBlocks.length === 1 ? 'sm' : 'xs'}
                />
              )}
            </div>
          ) : (
            <div key={idx} className="shrink-0 min-w-0" style={{ flex: `${block.length} 0 0` }} />
          )
        )}
      </div>
    );
  };

  return (
    <div
      className="absolute inset-0 pointer-events-auto"
      style={{ zIndex: ZIndex.contentOverlay + 2 }}
    >
      {/* Текущее состояние: отрезки по сетке, цвет команды и аватары; обводка как в режиме создания связей */}
      <div
        className={`absolute flex flex-col rounded-lg overflow-visible pointer-events-none ${PHASE_FOCUS_RING_SOURCE}`}
        style={{
          left: stripLeft,
          width: stripWidth,
          height: barHeight,
          top: barTopOffset,
          zIndex: ZIndex.contentOverlay,
        }}
      >
        {renderPhaseBlocks(blocks)}
      </div>
      {/* Слой кликов: ячейки подсвечиваются при наведении — по клику сразу виден результат */}
      <div
        className="absolute flex items-stretch rounded-lg overflow-hidden pointer-events-auto"
        style={{
          left: stripLeft,
          width: stripWidth,
          height: barHeight,
          top: barTopOffset,
          zIndex: ZIndex.contentOverlay + 1,
        }}
        onMouseLeave={() => setHoveredCellIndex(null)}
      >
        {cells.map((on, idx) => (
          <button
            key={idx}
            className={`flex-1 min-w-0 cursor-pointer border-0 transition-colors rounded-sm ${
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
      {/* Подтвердить / отменить — отступ как у кнопки связей */}
      <div
        className="absolute flex items-center justify-end gap-1 pl-1 pointer-events-auto"
        style={{
          left: cancelButtonContainerLeft,
          top: barTopOffset,
          height: barHeight,
          zIndex: ZIndex.contentOverlay,
        }}
      >
        {hasDraftChanges ? (
          <button
            aria-label={t('sprintPlanner.occupancy.segmentEditorConfirmTitle')}
            className="w-6 h-6 flex items-center justify-center rounded-md focus:outline-none cursor-pointer text-green-700/90 dark:text-green-400/90 border border-gray-200/60 dark:border-gray-600/45 bg-gray-50/80 dark:bg-gray-800/45 shadow-none hover:border-green-600/25 hover:bg-green-500/[0.12] hover:shadow-sm dark:hover:border-green-400/30 dark:hover:bg-green-400/[0.12] transition-colors duration-200"
            title={t('sprintPlanner.occupancy.segmentEditorConfirmTitle')}
            type="button"
            onClick={handleConfirm}
          >
            <Icon className="w-3.5 h-3.5" name="check" />
          </button>
        ) : null}
        <button
          aria-label={t('sprintPlanner.occupancy.segmentEditorDiscardTitle')}
          className="w-6 h-6 flex items-center justify-center rounded-md focus:outline-none cursor-pointer text-red-600/90 dark:text-red-400/90 border border-gray-200/60 dark:border-gray-600/45 bg-gray-50/80 dark:bg-gray-800/45 shadow-none hover:border-red-600/25 hover:bg-red-500/[0.1] hover:shadow-sm dark:hover:border-red-400/30 dark:hover:bg-red-400/[0.1] transition-colors duration-200"
          title={t('sprintPlanner.occupancy.segmentEditorDiscardTitle')}
          type="button"
          onClick={handleDiscard}
        >
          <Icon className="w-3.5 h-3.5" name="x" />
        </button>
      </div>
    </div>
  );
}
