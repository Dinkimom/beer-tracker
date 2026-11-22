'use client';

import type { QuarterMenuAnchor } from '../QuarterlyPlanBoardContext';
import type { DaySpan } from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import type { QuarterlyPlanNoteRow } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { observer } from 'mobx-react-lite';

import { Icon } from '@/components/Icon';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { getStickyNoteDashedGhostStyle } from '@/features/comments/utils/stickyNotePalette';
import { useDocumentDarkClass } from '@/hooks/useDocumentDarkClass';
import { QUARTER_WORKING_DAYS_PER_WEEK } from '@/lib/quarterlyPlans/quarterWeeks';

import { useQuarterLaneHeight, useQuarterlyPlanBoard, useQuarterPlanView } from '../QuarterlyPlanBoardContext';
import {
  freeDaysOfWeek,
  formatWeekRange,
  QUARTER_NEW_NOTE_ROWS,
  QUARTER_NEW_NOTE_WEEKS,
  quarterNoteHeightPx,
} from '../quarterlyPlanBoardModel';

/** Ячейка под курсором: действие строки — синяя подсветка, постановка заметки — превью листа. */
const WEEK_CELL_TONE = {
  action:
    'text-blue-600 hover:bg-blue-500/[0.08] focus-visible:bg-blue-500/[0.12] active:bg-blue-500/[0.16] dark:text-blue-300 dark:hover:bg-blue-400/10 dark:active:bg-blue-400/20',
  // Заметка: подсветки нет, под курсором — превью листа.
  note: '',
} as const;

interface QuarterlyPlanWeekCellsProps {
  /** Подпись ячейки для скринридера; к ней добавляется срок недели. */
  actionLabel?: string;
  /** Сущность строки: с инструментом «Заметка» клик по её неделе ставит заметку. */
  noteRow?: QuarterlyPlanNoteRow;
  /** Дни, занятые полосами: клетка действия строки встаёт на свободные дни недели, занятую целиком — пропускает. */
  occupiedDays?: ReadonlySet<number>;
  /** Своё действие строки по клику на неделю (назначить человека, добавить отсутствие); `span` — свободные дни клетки. */
  onWeekClick?: (week: number, anchor: QuarterMenuAnchor, span: DaySpan) => void;
}

/**
 * Кликабельные недели строки: при наведении показывают «+». Обычно клик — действие самой строки
 * по свободной неделе. С инструментом «Заметка» кликабельна любая неделя, и ячейки лежат поверх полос.
 */
export const QuarterlyPlanWeekCells = observer(function QuarterlyPlanWeekCells({
  actionLabel = '',
  noteRow,
  occupiedDays,
  onWeekClick,
}: QuarterlyPlanWeekCellsProps) {
  const { t } = useI18n();
  const { notes } = useQuarterlyPlanBoard();
  const { color: noteColor, active: noteTool } = notes;
  const { weeks } = useQuarterPlanView();
  const laneHeightPx = useQuarterLaneHeight();
  const isDark = useDocumentDarkClass();
  const weekWidth = 100 / weeks.length;

  const mode =
    noteTool && noteRow
      ? {
          label: t('quarterlyPlan.notePlaceWeek'),
          tone: 'note' as const,
          weeks,
          zIndex: ZIndex.contentInteractive + 1,
          free: (week: number): DaySpan | null => freeDaysOfWeek(week, undefined),
          onClick: (week: number) => notes.place(noteRow, week),
        }
      : {
          label: actionLabel,
          tone: 'action' as const,
          weeks,
          zIndex: undefined,
          free: (week: number): DaySpan | null => freeDaysOfWeek(week, occupiedDays),
          onClick: onWeekClick,
        };
  const { onClick } = mode;
  if (!onClick) return null;

  return mode.weeks.map((week) => {
    const span = mode.free(week.index);
    if (!span) return null;
    return (
    <button
      key={week.index}
      aria-label={`${mode.label} ${formatWeekRange(week)}`.trim()}
      className={`group/cell absolute inset-y-0 flex cursor-pointer items-center justify-center transition-colors focus-visible:outline-none ${WEEK_CELL_TONE[mode.tone]}`}
      style={{
        left: `${(span.startDay / QUARTER_WORKING_DAYS_PER_WEEK) * weekWidth}%`,
        width: `${(span.days / QUARTER_WORKING_DAYS_PER_WEEK) * weekWidth}%`,
        zIndex: mode.zIndex,
      }}
      type="button"
      onClick={(event) => onClick(week.index, { x: event.clientX, y: event.clientY }, span)}
    >
      {mode.tone === 'note' ? (
        // Превью постановки, как на доске спринта: пунктирный лист выбранного цвета в размер новой
        // заметки (две недели, две дорожки). В низкой строке — по её высоте: строка вырастет, когда заметка встанет.
        <span
          aria-hidden
          className="pointer-events-none absolute left-0.5 top-0.5 flex items-center justify-center opacity-0 transition-opacity group-hover/cell:opacity-100 group-focus-visible/cell:opacity-100"
          style={{
            ...getStickyNoteDashedGhostStyle(noteColor, isDark),
            height: `min(${quarterNoteHeightPx(QUARTER_NEW_NOTE_ROWS, laneHeightPx)}px, calc(100% - 4px))`,
            width: `calc(${Math.min(QUARTER_NEW_NOTE_WEEKS, weeks.length - week.index) * 100}% - 4px)`,
          }}
        >
          <Icon className="h-3.5 w-3.5" name="plus" />
        </span>
      ) : (
        <Icon
          className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover/cell:opacity-100 group-focus-visible/cell:opacity-100"
          name="plus"
        />
      )}
    </button>
    );
  });
});
