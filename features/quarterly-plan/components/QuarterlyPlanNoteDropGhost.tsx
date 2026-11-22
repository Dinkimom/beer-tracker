'use client';

import type { NoteLaneBlocker } from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import type { QuarterlyPlanNote, QuarterlyPlanNoteRow } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { observer } from 'mobx-react-lite';

import { ZIndex } from '@/constants';
import {
  getStickyNoteDashedGhostStyle,
  getStickyNotePaint,
} from '@/features/comments/utils/stickyNotePalette';
import { useDocumentDarkClass } from '@/hooks/useDocumentDarkClass';
import { assignNoteLanes, quarterNoteRowKey } from '@/lib/quarterlyPlans/quarterlyPlanLayout';

import { useQuarterLaneHeight, useQuarterlyPlanBoard, useQuarterPlanView } from '../QuarterlyPlanBoardContext';
import { quarterNoteHeightPx } from '../quarterlyPlanBoardModel';

/** Толщина черты «встанет сюда, строка вырастет» — как у превью нового слоя на доске спринта. */
const INSERT_LINE_PX = 3;

interface QuarterlyPlanNoteDropGhostProps {
  /** Полосы и плашки строки: заметка делит с ними дорожки. */
  blockers?: readonly NoteLaneBlocker[];
  /** Сущность строки; у строк без неё заметку не оставить. */
  noteRow?: QuarterlyPlanNoteRow;
  /** Заметки, которые уже стоят в строке. */
  notes: readonly QuarterlyPlanNote[];
  /** Текущая высота строки: по ней видно, помещается ли заметка без роста строки. */
  rowHeightPx: number;
  /** Где в строке начинаются дорожки заметок. */
  topPx: number;
}

/**
 * Превью переноса заметки в строке под курсором, как на доске спринта. Заметка помещается
 * в строку — пунктирный слот там, куда она встанет. Не помещается по высоте (строка вырастет) —
 * тонкая черта на уровне, с которого она начнётся. Превью высоту строки не меняет: доска
 * под курсором не прыгает.
 */
export const QuarterlyPlanNoteDropGhost = observer(function QuarterlyPlanNoteDropGhost({
  blockers,
  noteRow,
  notes,
  rowHeightPx,
  topPx,
}: QuarterlyPlanNoteDropGhostProps) {
  const { drag: noteDrag } = useQuarterlyPlanBoard().notes;
  const { weeks } = useQuarterPlanView();
  const laneHeightPx = useQuarterLaneHeight();
  const isDark = useDocumentDarkClass();
  if (noteDrag?.mode !== 'move' || !noteRow || quarterNoteRowKey(noteDrag.row) !== quarterNoteRowKey(noteRow)) {
    return null;
  }

  const { note } = noteDrag;
  const others = notes.filter((other) => other.id !== note.id);
  const lane = assignNoteLanes([...others, note], blockers).laneById.get(note.id) ?? 0;
  const slotTop = topPx + lane * laneHeightPx + 2;
  const fits = slotTop + quarterNoteHeightPx(note.rows, laneHeightPx) <= rowHeightPx;
  const horizontal = {
    left: `calc(${(note.startWeek / weeks.length) * 100}% + 2px)`,
    width: `calc(${(note.weeks / weeks.length) * 100}% - 4px)`,
    zIndex: ZIndex.contentInteractive + 1,
  };

  return fits ? (
    <div
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        ...getStickyNoteDashedGhostStyle(note.color, isDark),
        ...horizontal,
        height: quarterNoteHeightPx(note.rows, laneHeightPx),
        top: slotTop,
      }}
    />
  ) : (
    <div
      aria-hidden
      className="pointer-events-none absolute rounded-full"
      style={{
        ...horizontal,
        // Линия тонкая: бумага заметки на ней теряется, поэтому берём насыщенный swatch.
        backgroundColor: getStickyNotePaint(note.color, isDark).swatch,
        height: INSERT_LINE_PX,
        top: Math.min(slotTop, rowHeightPx - INSERT_LINE_PX - 1),
      }}
    />
  );
});
