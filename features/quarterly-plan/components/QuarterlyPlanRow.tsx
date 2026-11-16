'use client';

import type { QuarterMenuAnchor } from '../QuarterlyPlanBoardContext';
import type { NoteLaneBlocker } from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import type { QuarterlyPlanNoteRow } from '@/lib/quarterlyPlans/quarterlyPlanTypes';
import type { ReactNode } from 'react';

import { ZIndex } from '@/constants';
import { quarterNoteRowKey } from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import { QUARTER_WORKING_DAYS_PER_WEEK } from '@/lib/quarterlyPlans/quarterWeeks';

import { useQuarterlyPlanBoard, useQuarterRowNotes, useQuarterSprintStartWeeks } from '../QuarterlyPlanBoardContext';
import {
  QUARTER_HEADER_ROW_PX,
  QUARTER_LANE_HEIGHT_PX,
  QUARTER_LEFT_COLUMN_WIDTH,
  QUARTER_ROW_PADDING_PX,
  QUARTER_WEEK_LINE,
  type QuarterRowLevel,
} from '../quarterlyPlanBoardModel';

import { QuarterlyPlanNoteChip } from './QuarterlyPlanNoteChip';
import { QuarterlyPlanNoteDropGhost } from './QuarterlyPlanNoteDropGhost';
import { QuarterlyPlanNoteInlineEditor } from './QuarterlyPlanNoteInlineEditor';
import { QuarterlyPlanWeekCells } from './QuarterlyPlanWeekCells';

type QuarterlyPlanRowTone = 'default' | 'direction' | 'team';

/**
 * Горизонтальная линия одна на стык: под шапкой, под строкой команды и над каждым направлением;
 * линию над командой рисует её секция. Между обычными строками (эпики, строки отсутствий) — линия
 * слабее, того же веса, что линии недель: строки читаются, а границы направлений остаются главными.
 * Строка команды — стеклянная: она липнет под шапкой, под ней проезжают строки.
 */
const ROW_TONE_CLASS: Record<QuarterlyPlanRowTone, string> = {
  default: 'bg-white dark:bg-gray-800',
  // Направление — шапка своей группы: тонированная полоса во всю ширину отделяет его от эпиков под ним.
  direction: 'border-t border-ds-border-subtle bg-gray-50 dark:bg-[#253246]',
  // Стекло в сером тоне: строка команды липнет под шапкой, строки проезжают под ней размытыми.
  team: 'border-b border-ds-border-subtle quarter-team-glass',
};

/**
 * Левая ячейка лежит на стеклянной плашке колонки (`QuarterlyPlanBoard`), поэтому своего фона у неё нет —
 * только лёгкая вуаль поверх стекла: тон направления и подсветка строки под курсором. У строки команды,
 * которая липнет выше плашки, ячейка непрозрачная.
 */
const LEFT_CELL_CLASS: Record<QuarterlyPlanRowTone, string> = {
  default: 'group-hover/row:bg-gray-900/[0.035] dark:group-hover/row:bg-white/[0.05]',
  direction: 'bg-gray-900/[0.025] dark:bg-white/[0.04]',
  // Непрозрачная: стекло внутри стеклянной строки не размыло бы спринты, которые проезжают под ячейкой.
  team: 'bg-gray-100 dark:bg-[#2a3749]',
};

/** Верхняя линия левой ячейки — того же веса, что у самой строки. */
const LEFT_CELL_TOP_LINE: Record<QuarterlyPlanRowTone, string | undefined> = {
  default: `0 -1px 0 0 ${QUARTER_WEEK_LINE}`,
  direction: '0 -1px 0 0 var(--ds-border-subtle)',
  team: undefined,
};

/** Две строки шапки и её нижняя линия. */
const STICKY_TOP_PX = QUARTER_HEADER_ROW_PX * 2 + 1;

interface QuarterlyPlanRowProps {
  /** Содержимое таймлайна: полосы, штриховка, плашки. */
  children?: ReactNode;
  /** Высота строки без заметок; заметки строка добавляет сама. */
  heightPx: number;
  left: ReactNode;
  /** Полосы и плашки строки в дорожках заметок: заметка встаёт рядом с ними, а не только под ними. */
  noteBlockers?: readonly NoteLaneBlocker[];
  /** Сущность строки: в такую строку можно ставить и переносить заметки. */
  noteRow?: QuarterlyPlanNoteRow;
  /** Где начинается первая дорожка заметок; по умолчанию — под содержимым строки. */
  notesTopPx?: number;
  /** Недели, занятые полосами: клик по ним не ловим — второго человека добавляют из меню полосы. */
  occupiedWeeks?: ReadonlySet<number>;
  /**
   * Строку можно переставлять (QO2, QO3): её уровень и родитель — направление у эпика, эпик у задачи,
   * команда у направления. По ним ручка порядка находит соседей.
   */
  sortRow?: { id: string; level: QuarterRowLevel; parentId: string };
  /** Строка липнет под шапкой, пока на экране её секция. */
  sticky?: boolean;
  tone?: QuarterlyPlanRowTone;
  /** Подпись ячейки недели для скринридера; вместе с `onWeekClick` делает недели кликабельными. */
  weekActionLabel?: string;
  onWeekClick?: (week: number, anchor: QuarterMenuAnchor) => void;
}

/**
 * Строка квартальной доски: липкая левая ячейка и таймлайн с сеткой недель. Заметки строки лежат
 * дорожками под её содержимым.
 */
export function QuarterlyPlanRow({
  children,
  heightPx,
  left,
  noteBlockers,
  noteRow,
  notesTopPx,
  occupiedWeeks,
  sortRow,
  sticky = false,
  tone = 'default',
  weekActionLabel,
  onWeekClick,
}: QuarterlyPlanRowProps) {
  const { currentWeek, noteEditing, weeks } = useQuarterlyPlanBoard();
  const sprintStarts = useQuarterSprintStartWeeks();
  const rowNotes = useQuarterRowNotes(noteRow, noteBlockers);
  const weekWidth = 100 / weeks.length;
  const toneClass = ROW_TONE_CLASS[tone];
  const notesTop = notesTopPx ?? heightPx - QUARTER_ROW_PADDING_PX;
  const totalHeight = Math.max(
    heightPx,
    rowNotes.laneCount > 0 ? notesTop + rowNotes.laneCount * QUARTER_LANE_HEIGHT_PX + QUARTER_ROW_PADDING_PX : 0
  );

  return (
    <div
      className={`group/row flex transition-[min-height] duration-200 ${toneClass} ${sticky ? 'sticky' : ''}`}
      data-quarter-note-row={noteRow ? quarterNoteRowKey(noteRow) : undefined}
      data-quarter-sort={sortRow?.level}
      data-quarter-sort-id={sortRow?.id}
      data-quarter-sort-parent={sortRow?.parentId}
      style={{
        minHeight: totalHeight,
        ...(tone === 'default' ? { borderTop: `1px solid ${QUARTER_WEEK_LINE}` } : {}),
        ...(sticky ? { top: STICKY_TOP_PX, zIndex: ZIndex.stickyInContent + 1 } : {}),
      }}
    >
      <div
        className={`sticky left-0 flex shrink-0 items-start border-r border-ds-border-subtle transition-colors ${LEFT_CELL_CLASS[tone]} !border-b-0 !border-t-0`}
        style={{
          // Линия над строкой лежит под стеклом и размывается — в колонке рисуем её ещё раз, поверх стекла.
          boxShadow: LEFT_CELL_TOP_LINE[tone],
          width: QUARTER_LEFT_COLUMN_WIDTH,
          zIndex: ZIndex.stickyInContent,
        }}
      >
        {/* Задача эпика — ветка дерева: направляющая слева связывает задачи с их эпиком (QT1). */}
        {sortRow?.level === 'task' ? (
          <>
            <span aria-hidden className="absolute inset-y-0 left-[22px] w-px bg-ds-border-subtle" />
            <span aria-hidden className="absolute left-[22px] h-px w-2.5 bg-ds-border-subtle" style={{ top: heightPx / 2 }} />
          </>
        ) : null}
        {/* Подпись стоит напротив содержимого строки, а не посередине между ним и заметками. */}
        <div className="flex min-w-0 flex-1 items-center" style={{ minHeight: heightPx }}>
          {left}
        </div>
      </div>
      <div
        className="group/track relative min-w-0 flex-1"
        data-quarter-track
        style={
          // В строке команды сетку недель не рисуем: там ячейки спринтов, а недели уже размечены в шапке.
          tone === 'team'
            ? undefined
            : {
                backgroundImage: `linear-gradient(to right, ${QUARTER_WEEK_LINE} 1px, transparent 1px)`,
                backgroundPosition: '-1px 0',
                backgroundSize: `${weekWidth}% 100%`,
              }
        }
      >
        {/* Сетка дней — как части дня на свимлейне: в покое её нет, она проявляется в строке, где полосу
            или плашку тянут с шагом в день (`data-quarter-day-drag="1"` — шаг жеста в днях), и показывает, куда та встанет. */}
        {tone === 'team' ? null : (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-has-[[data-quarter-day-drag='1']]/track:opacity-100"
            style={{
              backgroundImage: `linear-gradient(to right, ${QUARTER_WEEK_LINE} 1px, transparent 1px)`,
              backgroundPosition: '-1px 0',
              backgroundSize: `${weekWidth / QUARTER_WORKING_DAYS_PER_WEEK}% 100%`,
            }}
          />
        )}
        {currentWeek >= 0 ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 bg-blue-500/[0.06] dark:bg-blue-400/[0.08]"
            style={{ left: `${currentWeek * weekWidth}%`, width: `${weekWidth}%` }}
          />
        ) : null}
        {/* Границы спринтов команды — тем же цветом, что линии между направлениями: недели внутри спринта слабее. */}
        {tone === 'team'
          ? null
          : sprintStarts.map((week) => (
              <div
                key={week}
                aria-hidden
                className="pointer-events-none absolute inset-y-0 w-px bg-ds-border-subtle"
                style={{ left: `calc(${week * weekWidth}% - 1px)` }}
              />
            ))}
        <QuarterlyPlanWeekCells
          actionLabel={weekActionLabel}
          noteRow={noteRow}
          occupiedWeeks={occupiedWeeks}
          onWeekClick={onWeekClick}
        />
        {children}
        <QuarterlyPlanNoteDropGhost
          blockers={noteBlockers}
          noteRow={noteRow}
          notes={rowNotes.notes}
          rowHeightPx={totalHeight}
          topPx={notesTop}
        />
        {rowNotes.notes.map((note) => {
          // Заметку правят прямо в листе; развёрнутая в режим фокуса остаётся листом (скрытым) — якорем полёта.
          const Note =
            noteEditing?.noteId === note.id && !noteEditing.expanded
              ? QuarterlyPlanNoteInlineEditor
              : QuarterlyPlanNoteChip;
          return <Note key={note.id} lane={rowNotes.laneById.get(note.id) ?? 0} note={note} topPx={notesTop} />;
        })}
      </div>
    </div>
  );
}
