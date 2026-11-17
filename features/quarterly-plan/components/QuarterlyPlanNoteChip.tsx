'use client';

import type { QuarterlyPlanNote, QuarterlyPlanNoteRow } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { useState } from 'react';

import { OverflowTooltip } from '@/components/OverflowTooltip';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { StickyNoteTextContent } from '@/features/comments/components/StickyNoteTextContent';
import { SwimlaneCommentDeleteButton } from '@/features/comments/components/SwimlaneCommentDeleteButton';
import { useStickyNoteTilt } from '@/features/comments/hooks/useStickyNoteTilt';
import {
  getStickyNoteCardStyle,
  getStickyNoteResizeHandlePaint,
} from '@/features/comments/utils/stickyNotePalette';
import {
  getStickyNotePlaceholderTextClass,
  getStickyNoteTextClass,
} from '@/features/comments/utils/stickyNoteSurfaceClasses';
import { SprintCardPresenceAvatars } from '@/features/task/components/TaskCard/SprintCardPresenceAvatars';
import { useDocumentDarkClass } from '@/hooks/useDocumentDarkClass';
import { resizeNoteRows } from '@/lib/quarterlyPlans/quarterlyPlanLayout';

import { useQuarterLaneHeight, useQuarterlyPlanBoard } from '../QuarterlyPlanBoardContext';
import {
  draftOutlineClass,
  QUARTER_STICKY_LABEL_LEFT,
  quarterNoteBoxStyle,
  quarterNoteHeightPx,
} from '../quarterlyPlanBoardModel';
import { useQuarterPresenceTarget } from '../QuarterlyPlanPresence';
import { useQuarterSpanDrag } from '../useQuarterSpanDrag';

import { draftItemsOf, QuarterlyPlanDraftItemToolbar } from './QuarterlyPlanDraftItemToolbar';
import { QuarterlyPlanResizeHandle } from './QuarterlyPlanResizeHandle';

/** Высота строки текста заметки (`text-xs leading-snug`) — по ней считаем, сколько строк помещается. */
const NOTE_LINE_PX = 16;
const HANDLE_MODE = { bottom: 'height', left: 'start', right: 'end' } as const;

interface QuarterlyPlanNoteChipProps {
  lane: number;
  note: QuarterlyPlanNote;
  /** Где в строке начинаются дорожки заметок. */
  topPx: number;
}

/** Строка доски под точкой экрана; сам перетаскиваемый стикер не в счёт. */
function noteRowAtPoint(x: number, y: number, dragged: HTMLElement | null): QuarterlyPlanNoteRow | null {
  for (const element of document.elementsFromPoint(x, y)) {
    if (dragged?.contains(element)) continue;
    const key = element.closest<HTMLElement>('[data-quarter-note-row]')?.dataset.quarterNoteRow;
    if (key) {
      const separator = key.indexOf(':');
      return { id: key.slice(separator + 1), kind: key.slice(0, separator) as QuarterlyPlanNoteRow['kind'] };
    }
  }
  return null;
}

/**
 * Заметка-стикер в строке доски — тот же лист, что на доске спринта: бумага, почерк, лёгкий наклон,
 * текст со ссылками, ключами задач и упоминаниями, крестик удаления в углу. Клик открывает редактор
 * фокуса. Края тянут по неделям, нижний край — по высоте; строка перекладывается сразу, пока идёт
 * жест. Сам стикер несут за курсором в любую строку (команда, отпуска, направление, эпик): строка
 * под курсором показывает место, куда он встанет. Отпустили мимо строк — заметка возвращается на место.
 */
export function QuarterlyPlanNoteChip({ lane, note, topPx }: QuarterlyPlanNoteChipProps) {
  const { t } = useI18n();
  const { draftMarks, draftReview, noteEditing, onNoteChange, onNoteClick, onNoteDelete, onNoteDrag, weeks } =
    useQuarterlyPlanBoard();
  const laneHeightPx = useQuarterLaneHeight();
  const isDark = useDocumentDarkClass();
  const tiltRef = useStickyNoteTilt(true, note.id);
  const weekCount = weeks.length;
  const rowsAfter = (dy: number) => resizeNoteRows(note.rows, Math.round(dy / laneHeightPx));

  // Пока заметка развёрнута в редакторе фокуса, её место на доске пустует.
  const focused = noteEditing?.noteId === note.id;
  const [ownGesture, setOwnGesture] = useState<'dragging' | 'resizing' | null>(null);
  // Заметку несёт, растягивает или редактирует другой человек (QS7): свои жесты ждут.
  const presence = useQuarterPresenceTarget(note.id, focused ? 'editing' : ownGesture);
  const { begin, drag, rootProps, rootRef, span } = useQuarterSpanDrag({
    disabled: presence.locked,
    free: true,
    span: note,
    weekCount,
    onChange: (next, pointer, gesture) => {
      if (gesture.mode === 'height') {
        onNoteChange(note.id, { rows: rowsAfter(gesture.dy) });
      } else if (gesture.mode === 'move') {
        const row = noteRowAtPoint(pointer.x, pointer.y, rootRef.current);
        if (row) onNoteChange(note.id, { ...next, row });
      } else {
        onNoteChange(note.id, next);
      }
    },
    onClick: (pointer) => onNoteClick(note.id, pointer),
    onEnd: () => {
      setOwnGesture(null);
      onNoteDrag(null);
    },
    onMove: (next, pointer, gesture) => {
      setOwnGesture(gesture.mode === 'move' ? 'dragging' : 'resizing');
      if (gesture.mode !== 'move') {
        const rows = gesture.mode === 'height' ? rowsAfter(gesture.dy) : note.rows;
        onNoteDrag({ mode: 'resize', note: { ...note, ...next, rows }, row: note.row });
        return;
      }
      const row = noteRowAtPoint(pointer.x, pointer.y, rootRef.current);
      onNoteDrag(row ? { mode: 'move', note: { ...note, startWeek: next.startWeek }, row } : null);
    },
  });

  const carried = drag?.mode === 'move';
  const rows = drag?.mode === 'height' ? rowsAfter(drag.dy) : note.rows;
  const heightPx = quarterNoteHeightPx(rows, laneHeightPx);
  // Пока стикер несут, он остаётся на своём сроке и едет за курсором; новое место показывает превью.
  const shown = carried ? note : span;
  const handlePaint = getStickyNoteResizeHandlePaint(note.color, isDark);

  return (
    <div
      ref={rootRef}
      aria-label={note.text || t('comments.placeholder')}
      className={`group absolute touch-none select-none rounded focus-visible:outline-none ${presence.locked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'} ${presence.ringClass} ${focused ? 'pointer-events-none opacity-0' : ''} ${draftOutlineClass(draftMarks, note.id)}`}
      data-quarter-note={note.id}
      style={{
        ...presence.ringStyle,
        ...quarterNoteBoxStyle({ ...shown, rows }, lane, topPx, weekCount, laneHeightPx),
        ...(carried ? { transform: `translate(${drag.dx}px, ${drag.dy}px)` } : {}),
        // Стикер в руке — поверх строк, в том числе липкой строки команды.
        zIndex: drag ? ZIndex.stickyInContent + 2 : ZIndex.contentInteractive + Number(draftItemsOf(draftReview, note.id).length > 0),
      }}
      title={presence.locked ? t('quarterlyPlan.presenceLocked') : undefined}
      {...rootProps}
      {...presence.hoverProps}
    >
      <div
        ref={tiltRef}
        className={`sticky-note-paper flex h-full w-full px-2 text-xs leading-snug hover:brightness-95 dark:hover:brightness-110 ${getStickyNoteTextClass()} ${rows > 1 ? 'items-start pt-1' : 'items-center'} ${carried ? 'opacity-90 !shadow-lg' : ''}`}
        style={getStickyNoteCardStyle(note.color, isDark)}
      >
        <span className="sticky flex min-w-0" style={{ left: QUARTER_STICKY_LABEL_LEFT }}>
          <OverflowTooltip content={note.text}>
            <span
              className={`min-w-0 overflow-hidden whitespace-pre-wrap break-words ${note.text ? '' : getStickyNotePlaceholderTextClass()}`}
              style={{
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: Math.max(1, Math.floor((heightPx - 4) / NOTE_LINE_PX)),
                display: '-webkit-box',
              }}
            >
              {note.text ? (
                <StickyNoteTextContent isDragging={drag !== null} text={note.text} />
              ) : (
                t('comments.placeholder')
              )}
            </span>
          </OverflowTooltip>
        </span>
        {carried || presence.locked
          ? null
          : (['left', 'right', 'bottom'] as const).map((side) => (
              <QuarterlyPlanResizeHandle
                key={side}
                active={drag?.mode === HANDLE_MODE[side]}
                paint={handlePaint}
                side={side}
                onPointerDown={begin(HANDLE_MODE[side])}
              />
            ))}
      </div>
      {drag || presence.locked ? null : (
        // Крестик лежит вне бумаги, в углу листа; нажатие по нему не начинает перенос.
        <span onPointerDown={(event) => event.stopPropagation()}>
          <SwimlaneCommentDeleteButton color={note.color} tilt onDelete={() => onNoteDelete(note.id)} />
        </span>
      )}
      <SprintCardPresenceAvatars taskId={note.id} />
      <QuarterlyPlanDraftItemToolbar hidden={drag !== null} id={note.id} placement="below" />
    </div>
  );
}
