'use client';

import type {
  QuarterlyPlanBoardContextValue,
  QuarterlyPlanNoteDrag,
} from './QuarterlyPlanBoardContext';
import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type {
  QuarterlyPlan,
  QuarterlyPlanContent,
  QuarterlyPlanNote,
} from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { useCallback, useMemo, useState } from 'react';

import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useQuarterNotesVisibleStorage } from '@/hooks/useLocalStorage';
import { DEFAULT_STICKY_NOTE_COLOR } from '@/lib/comments/stickyNoteColor';
import {
  addNote,
  quarterNoteRowKey,
  removeNote,
  updateNote,
} from '@/lib/quarterlyPlans/quarterlyPlanLayout';

import { QUARTER_NEW_NOTE_ROWS, QUARTER_NEW_NOTE_WEEKS } from './quarterlyPlanBoardModel';

/**
 * Заметка в редакторе. Новая (`draft`) ещё не в плане: её лист стоит на доске черновиком,
 * пока текст не подтвердят, — как черновик заметки на доске спринта.
 */
interface NoteEditingState {
  color: StickyNoteColor;
  draft: QuarterlyPlanNote | null;
  /** Развёрнута в режим фокуса; иначе правится в листе на доске. */
  expanded: boolean;
  noteId: string;
  /** Текст, с которого начинает редактор листа; набор в листе живёт в самом листе. */
  value: string;
}

type NotesBoardSlice = Pick<
  QuarterlyPlanBoardContextValue,
  'noteColor' | 'noteDrag' | 'noteEditActions' | 'noteEditing' | 'notesByRow' | 'noteTool' | 'onNoteChange' | 'onNoteClick' | 'onNoteDelete' | 'onNoteDrag' | 'onNotePlace'
>;

interface UseQuarterlyPlanNotesInput {
  plan: QuarterlyPlan | null;
  weekCount: number;
  applyEdit: (edit: (content: QuarterlyPlanContent) => QuarterlyPlanContent) => void;
}

/**
 * Заметки квартальной доски — сценарий доски спринта. Инструмент «Заметка»: клик по неделе ставит
 * лист-черновик и открывает правку прямо в нём; клик по готовой заметке — то же. Из листа правку
 * можно развернуть в режим фокуса и вернуть обратно.
 * Цвет новой заметки — выбранный у инструмента.
 */
export function useQuarterlyPlanNotes({ applyEdit, plan, weekCount }: UseQuarterlyPlanNotesInput) {
  const [noteTool, setNoteToolState] = useState(false);
  /** Слой «Заметки» (QN7): скрытые заметки не рисуются и не занимают дорожки строк. */
  const [notesVisible, setNotesVisible] = useQuarterNotesVisibleStorage();
  // Инструмент ставит новый лист — с выключенным слоем его не было бы видно, поэтому слой включается.
  const setNoteTool = useCallback(
    (active: boolean) => {
      setNoteToolState(active);
      if (active) setNotesVisible(true);
    },
    [setNotesVisible]
  );
  const [noteColor, setNoteColor] = useState<StickyNoteColor>(DEFAULT_STICKY_NOTE_COLOR);
  const [editing, setEditing] = useState<NoteEditingState | null>(null);
  const [noteDrag, setNoteDrag] = useState<QuarterlyPlanNoteDrag | null>(null);
  /** Текст в режиме фокуса: вне контекста доски, чтобы набор не перерисовывал её целиком. */
  const [focusValue, setFocusValue] = useState('');

  useEscapeKey(() => setNoteTool(false), { enabled: noteTool });

  const notes = plan?.notes;
  const draft = editing?.draft ?? null;
  const notesByRow = useMemo(() => {
    const groups = new Map<string, QuarterlyPlanNote[]>();
    if (!notesVisible) return groups;
    for (const note of draft ? [...(notes ?? []), draft] : (notes ?? [])) {
      const key = quarterNoteRowKey(note.row);
      groups.set(key, [...(groups.get(key) ?? []), note]);
    }
    return groups;
  }, [draft, notes, notesVisible]);

  const noteEditing = useMemo(
    () =>
      editing
        ? { color: editing.color, expanded: editing.expanded, noteId: editing.noteId, value: editing.value }
        : null,
    [editing]
  );
  const board = useMemo<NotesBoardSlice>(
    () => ({
      noteColor,
      noteDrag,
      noteEditActions: {
        cancel: () => setEditing(null),
        color: (color) => {
          setNoteColor(color);
          setEditing((current) => (current ? { ...current, color } : current));
        },
        expand: (value) => {
          setFocusValue(value);
          setEditing((current) => (current ? { ...current, expanded: true, value } : current));
        },
        // Черновик попадает в план, готовая заметка получает текст и цвет; пустой текст не сохраняется.
        submit: (value) => {
          if (!editing) return;
          const { color, draft: created, noteId } = editing;
          const text = value.trim();
          setEditing(null);
          if (!text) return;
          applyEdit((content) =>
            created ? addNote(content, { ...created, color, text }) : updateNote(content, noteId, { color, text })
          );
        },
      },
      noteEditing,
      noteTool,
      notesByRow,
      onNoteChange: (noteId, patch) => applyEdit((content) => updateNote(content, noteId, patch)),
      onNoteClick: (noteId) => {
        const note = notes?.find((item) => item.id === noteId);
        if (note) setEditing({ color: note.color, draft: null, expanded: false, noteId, value: note.text });
      },
      onNoteDelete: (noteId) => applyEdit((content) => removeNote(content, noteId)),
      // Жест обновляется только при смене строки, недели или размера, а не на каждый пиксель.
      onNoteDrag: (next) =>
        setNoteDrag((current) =>
          current?.mode === next?.mode &&
          current?.row.id === next?.row.id &&
          current?.row.kind === next?.row.kind &&
          current?.note.startWeek === next?.note.startWeek &&
          current?.note.weeks === next?.note.weeks &&
          current?.note.rows === next?.note.rows
            ? current
            : next
        ),
      // Инструмент отпускается после одной заметки, как на доске спринта.
      onNotePlace: (row, startWeek) => {
        const note: QuarterlyPlanNote = {
          color: noteColor,
          id: crypto.randomUUID(),
          row,
          rows: QUARTER_NEW_NOTE_ROWS,
          startWeek,
          text: '',
          weeks: Math.min(QUARTER_NEW_NOTE_WEEKS, weekCount - startWeek),
        };
        setNoteTool(false);
        setEditing({ color: noteColor, draft: note, expanded: false, noteId: note.id, value: '' });
      },
    }),
    [applyEdit, editing, noteColor, noteDrag, noteEditing, noteTool, notes, notesByRow, setNoteTool, weekCount]
  );

  /** Пропсы редактора фокуса (`TaskBarNoteFocusEditor`); null — заметка не развёрнута. */
  const focusEditor = editing?.expanded
    ? {
        editor: {
          color: editing.color,
          value: focusValue,
          onCancel: () => setEditing(null),
          onChange: setFocusValue,
          onColorChange: board.noteEditActions.color,
          onSubmit: () => board.noteEditActions.submit(focusValue),
        },
        // Лист на доске, из которого редактор выезжает и в который возвращается.
        getAnchor: () => document.querySelector<HTMLElement>(`[data-quarter-note="${editing.noteId}"]`),
        // «Вернуть на доску»: правка продолжается в листе с набранным текстом.
        onCollapse: () => setEditing({ ...editing, expanded: false, value: focusValue }),
      }
    : null;

  return { board, focusEditor, noteColor, notesVisible, noteTool, setNoteColor, setNotesVisible, setNoteTool };
}
