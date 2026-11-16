'use client';

import type { QuarterRowPlace } from '@/lib/quarterlyPlans/quarterlyPlanRows';

import { useRef, useState } from 'react';

import { Icon } from '@/components/Icon';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';

import { useQuarterlyPlanBoard } from '../QuarterlyPlanBoardContext';
import { QUARTER_ROW_LEVELS, type QuarterRowLevel } from '../quarterlyPlanBoardModel';

interface RowDrop {
  anchorId: string;
  /** Где на экране встанет строка: по этой высоте рисуется линия. */
  lineY: number;
  place: QuarterRowPlace;
}

/** Нижний край строки вместе с тем, что под ней вложено: эпики направления, задачи эпика. */
function groupBottom(row: HTMLElement, level: QuarterRowLevel): number {
  const depth = QUARTER_ROW_LEVELS.indexOf(level);
  let last = row;
  for (let next = row.nextElementSibling; next instanceof HTMLElement; next = next.nextElementSibling) {
    const nextLevel = next.dataset.quarterSort as QuarterRowLevel | undefined;
    if (nextLevel && QUARTER_ROW_LEVELS.indexOf(nextLevel) <= depth) break;
    last = next;
  }
  return last.getBoundingClientRect().bottom;
}

/**
 * Куда встанет строка, если отпустить её на высоте `y`: рядом с ближайшей строкой того же уровня
 * своей команды. null — строка остаётся на месте.
 */
function findRowDrop(self: HTMLElement, level: QuarterRowLevel, y: number): RowDrop | null {
  const rows = [...(self.closest('section')?.querySelectorAll<HTMLElement>(`[data-quarter-sort="${level}"]`) ?? [])];
  const zones = rows.map((row) => ({ bottom: groupBottom(row, level), row, top: row.getBoundingClientRect().top }));
  const distance = (zone: (typeof zones)[number]) => Math.max(zone.top - y, y - zone.bottom, 0);
  const nearest = [...zones].sort((a, b) => distance(a) - distance(b))[0];
  if (!nearest || nearest.row === self) return null;
  const place: QuarterRowPlace = y < (nearest.top + nearest.bottom) / 2 ? 'before' : 'after';
  // Сосед того же родителя уже стоит так — двигать нечего.
  const index = rows.indexOf(nearest.row);
  const neighbor = rows[place === 'before' ? index - 1 : index + 1];
  if (neighbor === self && self.dataset.quarterSortParent === nearest.row.dataset.quarterSortParent) return null;
  return {
    anchorId: nearest.row.dataset.quarterSortId ?? '',
    lineY: place === 'before' ? nearest.top : nearest.bottom,
    place,
  };
}

interface QuarterlyPlanSortHandleProps {
  id: string;
  level: QuarterRowLevel;
}

/**
 * Ручка порядка строки (QO2, QO3): строку тянут вверх или вниз и отпускают рядом со строкой того же
 * уровня; линия показывает, куда она встанет. Видна при наведении на строку.
 */
export function QuarterlyPlanSortHandle({ id, level }: QuarterlyPlanSortHandleProps) {
  const { t } = useI18n();
  const { onRowMove } = useQuarterlyPlanBoard();
  const dropRef = useRef<RowDrop | null>(null);
  const [line, setLine] = useState<{ left: number; top: number; width: number } | null>(null);

  const finish = (apply: boolean) => {
    const drop = dropRef.current;
    dropRef.current = null;
    setLine(null);
    if (apply && drop) onRowMove(level, id, drop.anchorId, drop.place);
  };

  return (
    <>
      <button
        aria-label={t('quarterlyPlan.sortRow')}
        className={`absolute ${level === 'task' ? 'left-8' : 'left-0'} top-1/2 flex h-6 w-4 -translate-y-1/2 cursor-grab touch-none items-center justify-center rounded text-ds-text-muted opacity-0 transition-colors hover:bg-black/[0.06] hover:text-gray-900 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:cursor-grabbing active:bg-black/10 group-hover/row:opacity-100 dark:hover:bg-white/10 dark:hover:text-gray-100 dark:active:bg-white/15`}
        title={t('quarterlyPlan.sortRow')}
        type="button"
        onPointerCancel={() => finish(false)}
        onPointerDown={(event) => {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          const row = event.currentTarget.closest<HTMLElement>('[data-quarter-sort]');
          const scroller = row?.closest('[data-quarter-scroller]')?.getBoundingClientRect();
          const drop = row ? findRowDrop(row, level, event.clientY) : null;
          dropRef.current = drop;
          setLine(drop && scroller ? { left: scroller.left, top: drop.lineY, width: scroller.width } : null);
        }}
        onPointerUp={(event) => {
          event.currentTarget.releasePointerCapture(event.pointerId);
          finish(true);
        }}
      >
        <Icon className="h-3.5 w-3.5" name="grip-vertical" />
      </button>
      {line ? (
        <div
          aria-hidden
          className="pointer-events-none fixed h-0.5 -translate-y-px rounded-full bg-blue-500"
          style={{ ...line, zIndex: ZIndex.contentInteractive + 3 }}
        />
      ) : null}
    </>
  );
}
