'use client';

import type { AvailabilityCardKind } from '@/features/swimlane/utils/availabilityCardKind';
import type { AvailabilitySegment } from '@/features/swimlane/utils/availabilitySegments';

import { useEffect, useRef, useState } from 'react';

import { PARTS_PER_DAY, WORKING_DAYS, ZIndex } from '@/constants';
import { PlannerAvailabilityLabelBackground } from '@/features/sprint/components/SprintPlanner/layout/PlannerAvailabilityLabelBackground';
import { PlannerHatchOverlay } from '@/features/sprint/components/SprintPlanner/layout/PlannerHatchOverlay';
import { PLANNER_HATCH_BASE_CLASS } from '@/features/sprint/components/SprintPlanner/layout/plannerHatchTones';

const DEFAULT_TOTAL_PARTS = WORKING_DAYS * PARTS_PER_DAY;

import {
  PHASE_BAR_HEIGHT_PX,
  PHASE_ROW_INSET_PX,
} from '../task-row/plan/occupancyPhaseBarConstants';

function findHorizontalScrollParent(el: HTMLElement | null): HTMLElement | null {
  let current = el;
  while (current) {
    const style = getComputedStyle(current);
    const ox = style.overflowX;
    if (ox === 'auto' || ox === 'scroll' || ox === 'overlay') return current;
    current = current.parentElement;
  }
  return null;
}

function updateStickyOffset(
  barEl: HTMLElement | null,
  scrollParent: HTMLElement | null,
  leftColumnWidthPx: number,
  setOffset: (px: number) => void
) {
  if (!barEl || !scrollParent) return;
  const barRect = barEl.getBoundingClientRect();
  const scrollRect = scrollParent.getBoundingClientRect();
  const targetLeft = scrollRect.left + leftColumnWidthPx;
  const stickyLeft = targetLeft - barRect.left;
  const offset = Math.max(0, stickyLeft);
  setOffset(offset);
}

const TYPE_CONFIG: Record<
  AvailabilityCardKind,
  { label: string; borderClass: string; textClass: string }
> = {
  vacation: {
    label: 'Отпуск',
    borderClass: 'border-2 border-amber-400/90 dark:border-amber-600',
    textClass: 'text-amber-900 dark:text-amber-100',
  },
  sick_leave: {
    label: 'Больничный',
    borderClass: 'border-2 border-rose-400/90 dark:border-rose-600',
    textClass: 'text-rose-900 dark:text-rose-100',
  },
  duty: {
    label: 'Дежурство',
    borderClass: 'border-2 border-violet-400/90 dark:border-violet-600',
    textClass: 'text-violet-900 dark:text-violet-100',
  },
  'tech-sprint-web': {
    label: 'Техспринт (Web)',
    borderClass: 'border-2 border-sky-400/90 dark:border-sky-600',
    textClass: 'text-sky-900 dark:text-sky-100',
  },
  'tech-sprint-back': {
    label: 'Техспринт (Back)',
    borderClass: 'border-2 border-emerald-400/90 dark:border-emerald-600',
    textClass: 'text-emerald-900 dark:text-emerald-100',
  },
  'tech-sprint-qa': {
    label: 'Техспринт (QA)',
    borderClass: 'border-2 border-amber-400/90 dark:border-amber-600',
    textClass: 'text-amber-900 dark:text-amber-100',
  },
};

interface OccupancyAvailabilityBarProps {
  /** Высота полосы (по умолчанию как у фаз в полном режиме; в компактном — меньше) */
  barHeightPx?: number;
  /** Высота строки (для вертикального центрирования) */
  rowHeight: number;
  segment: AvailabilitySegment;
  /** Ширина колонки «Задачи» (sticky left) — текст прилипает справа от неё при скролле */
  taskColumnWidth: number;
  /** Всего «частей» таймлайна (рабочие дни × частей в день); по умолчанию как у 10-дневного спринта */
  totalTimelineParts?: number;
}

/** Полоса отпуска/техспринта в таймлайне занятости: только отображение, без перетаскивания и изменения */
export function OccupancyAvailabilityBar({
  barHeightPx = PHASE_BAR_HEIGHT_PX,
  segment,
  rowHeight,
  taskColumnWidth,
  totalTimelineParts = DEFAULT_TOTAL_PARTS,
}: OccupancyAvailabilityBarProps) {
  const config = TYPE_CONFIG[segment.kind];
  const totalParts = Math.max(1, totalTimelineParts);
  const startCell = segment.startDay * PARTS_PER_DAY;
  const leftPercent = (startCell / totalParts) * 100;
  const widthPercent = (segment.durationInParts / totalParts) * 100;
  const displayText = `${config.label} - ${segment.dateRangeLabel}`;

  const barRef = useRef<HTMLDivElement>(null);
  const [textLeftPx, setTextLeftPx] = useState(0);

  useEffect(() => {
    const barEl = barRef.current;
    const scrollParent = findHorizontalScrollParent(barEl ?? null);
    if (!scrollParent) return;

    const sync = () =>
      updateStickyOffset(barEl, scrollParent, taskColumnWidth, setTextLeftPx);
    sync();

    scrollParent.addEventListener('scroll', sync, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(scrollParent);

    return () => {
      scrollParent.removeEventListener('scroll', sync);
      ro.disconnect();
    };
  }, [taskColumnWidth]);

  const labelIsSticky = textLeftPx > 0;

  return (
    <div
      ref={barRef}
      aria-label={displayText}
      className={`absolute overflow-hidden rounded-lg shadow-sm pointer-events-none select-none flex items-center ${PLANNER_HATCH_BASE_CLASS} ${config.borderClass} ${config.textClass} ${labelIsSticky ? 'overflow-visible' : ''}`}
      role="status"
      style={{
        left: `calc(${leftPercent}% + ${PHASE_ROW_INSET_PX}px)`,
        width: `calc(${widthPercent}% - ${PHASE_ROW_INSET_PX * 2}px)`,
        height: barHeightPx,
        top: (rowHeight - barHeightPx) / 2,
        fontSize: '11px',
        fontWeight: 600,
        zIndex: ZIndex.contentOverlay,
      }}
      title={displayText}
    >
      <PlannerHatchOverlay tone={segment.kind} />
      <span
        className="relative overflow-hidden truncate pl-2 pr-1.5 z-10"
        style={{
          position: 'absolute',
          left: textLeftPx,
          minWidth: 0,
          maxWidth: labelIsSticky ? '220px' : `calc(100% - ${textLeftPx}px)`,
          height: barHeightPx,
          lineHeight: `${barHeightPx}px`,
        }}
      >
        <PlannerAvailabilityLabelBackground tone={segment.kind} />
        <span className="relative z-10 truncate">{displayText}</span>
      </span>
    </div>
  );
}
