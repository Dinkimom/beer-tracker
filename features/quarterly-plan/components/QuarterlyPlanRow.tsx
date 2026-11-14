'use client';

import type { QuarterMenuAnchor } from '../QuarterlyPlanBoardContext';
import type { NoteLaneBlocker } from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import type { QuarterlyPlanNoteRow } from '@/lib/quarterlyPlans/quarterlyPlanTypes';
import type { ReactNode } from 'react';

import { ZIndex } from '@/constants';
import { quarterNoteRowKey } from '@/lib/quarterlyPlans/quarterlyPlanLayout';

import { useQuarterlyPlanBoard, useQuarterRowNotes } from '../QuarterlyPlanBoardContext';
import {
  QUARTER_HEADER_ROW_PX,
  QUARTER_LANE_HEIGHT_PX,
  QUARTER_LEFT_COLUMN_PX,
  QUARTER_ROW_PADDING_PX,
  QUARTER_WEEK_LINE,
} from '../quarterlyPlanBoardModel';

import { QuarterlyPlanNoteChip } from './QuarterlyPlanNoteChip';
import { QuarterlyPlanNoteDropGhost } from './QuarterlyPlanNoteDropGhost';
import { QuarterlyPlanNoteInlineEditor } from './QuarterlyPlanNoteInlineEditor';
import { QuarterlyPlanWeekCells } from './QuarterlyPlanWeekCells';

type QuarterlyPlanRowTone = 'default' | 'direction' | 'team';

/**
 * Горизонтальная линия одна на стык: под шапкой, под строкой команды и над каждым направлением;
 * линию над командой рисует её секция. Эпики внутри направления идут без разделителей.
 * Фоны непрозрачные — левая колонка и строка команды липкие, под ними проезжают полосы.
 */
const ROW_TONE_CLASS: Record<QuarterlyPlanRowTone, string> = {
  default: 'bg-white dark:bg-gray-800',
  direction: 'border-t border-ds-border-subtle bg-white dark:bg-gray-800',
  team: 'border-b border-ds-border-subtle bg-gray-100 dark:bg-[#2a3749]',
};

/** Подсветка левой ячейки строки под курсором; фон непрозрачный, как у остальных тонов. */
const ROW_HOVER_CLASS = 'group-hover/row:bg-gray-50 dark:group-hover/row:bg-[#243044]';

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
  sticky = false,
  tone = 'default',
  weekActionLabel,
  onWeekClick,
}: QuarterlyPlanRowProps) {
  const { currentWeek, noteEditing, weeks } = useQuarterlyPlanBoard();
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
      style={{
        minHeight: totalHeight,
        ...(sticky ? { top: STICKY_TOP_PX, zIndex: ZIndex.stickyInContent + 1 } : {}),
      }}
    >
      <div
        className={`sticky left-0 flex shrink-0 items-start border-r border-ds-border-subtle transition-colors ${toneClass} ${tone === 'default' ? ROW_HOVER_CLASS : ''} !border-b-0 !border-t-0`}
        style={{ width: QUARTER_LEFT_COLUMN_PX, zIndex: ZIndex.stickyInContent }}
      >
        {/* Подпись стоит напротив содержимого строки, а не посередине между ним и заметками. */}
        <div className="flex min-w-0 flex-1 items-center" style={{ minHeight: heightPx }}>
          {left}
        </div>
      </div>
      <div
        className="relative min-w-0 flex-1"
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
        {currentWeek >= 0 ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 bg-blue-500/[0.06] dark:bg-blue-400/[0.08]"
            style={{ left: `${currentWeek * weekWidth}%`, width: `${weekWidth}%` }}
          />
        ) : null}
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
