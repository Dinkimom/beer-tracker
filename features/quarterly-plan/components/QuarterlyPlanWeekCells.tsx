'use client';

import type { QuarterMenuAnchor } from '../QuarterlyPlanBoardContext';
import type { QuarterlyPlanNoteRow } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { Icon } from '@/components/Icon';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { getStickyNoteDashedGhostStyle } from '@/features/comments/utils/stickyNotePalette';
import { useDocumentDarkClass } from '@/hooks/useDocumentDarkClass';

import { useQuarterlyPlanBoard } from '../QuarterlyPlanBoardContext';
import {
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
  /** Недели, занятые полосами: своё действие строки по ним не ловим. */
  occupiedWeeks?: ReadonlySet<number>;
  /** Своё действие строки по клику на неделю (назначить человека, добавить отсутствие). */
  onWeekClick?: (week: number, anchor: QuarterMenuAnchor) => void;
}

/**
 * Кликабельные недели строки: при наведении показывают «+». Обычно клик — действие самой строки
 * по свободной неделе. С инструментом «Заметка» кликабельна любая неделя, и ячейки лежат поверх полос.
 */
export function QuarterlyPlanWeekCells({
  actionLabel = '',
  noteRow,
  occupiedWeeks,
  onWeekClick,
}: QuarterlyPlanWeekCellsProps) {
  const { t } = useI18n();
  const { noteColor, noteTool, onNotePlace, weeks } = useQuarterlyPlanBoard();
  const isDark = useDocumentDarkClass();
  const weekWidth = 100 / weeks.length;

  const mode =
    noteTool && noteRow
      ? {
          label: t('quarterlyPlan.notePlaceWeek'),
          tone: 'note' as const,
          weeks,
          zIndex: ZIndex.contentInteractive + 1,
          onClick: (week: number, anchor: QuarterMenuAnchor) => onNotePlace(noteRow, week, anchor),
        }
      : {
          label: actionLabel,
          tone: 'action' as const,
          weeks: weeks.filter((week) => !occupiedWeeks?.has(week.index)),
          zIndex: undefined,
          onClick: onWeekClick,
        };
  const { onClick } = mode;
  if (!onClick) return null;

  return mode.weeks.map((week) => (
    <button
      key={week.index}
      aria-label={`${mode.label} ${formatWeekRange(week)}`.trim()}
      className={`group/cell absolute inset-y-0 flex cursor-pointer items-center justify-center transition-colors focus-visible:outline-none ${WEEK_CELL_TONE[mode.tone]}`}
      style={{ left: `${week.index * weekWidth}%`, width: `${weekWidth}%`, zIndex: mode.zIndex }}
      type="button"
      onClick={(event) => onClick(week.index, { x: event.clientX, y: event.clientY })}
    >
      {mode.tone === 'note' ? (
        // Превью постановки, как на доске спринта: пунктирный лист выбранного цвета в размер новой
        // заметки (две недели, две дорожки). В низкой строке — по её высоте: строка вырастет, когда заметка встанет.
        <span
          aria-hidden
          className="pointer-events-none absolute left-0.5 top-0.5 flex items-center justify-center opacity-0 transition-opacity group-hover/cell:opacity-100 group-focus-visible/cell:opacity-100"
          style={{
            ...getStickyNoteDashedGhostStyle(noteColor, isDark),
            height: `min(${quarterNoteHeightPx(QUARTER_NEW_NOTE_ROWS)}px, calc(100% - 4px))`,
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
  ));
}
