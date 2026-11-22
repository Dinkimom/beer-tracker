'use client';

import type { QuarterlyPlanNote } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { observer } from 'mobx-react-lite';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { StickyNoteRichEditor } from '@/features/comments/components/StickyNoteRichEditor';
import { getStickyNoteCardStyle } from '@/features/comments/utils/stickyNotePalette';
import { TaskBarDraftSaveButton } from '@/features/task/components/TaskBar/TaskBarDraftSaveButton';
import { useDocumentDarkClass } from '@/hooks/useDocumentDarkClass';

import { useQuarterLaneHeight, useQuarterlyPlanBoard, useQuarterPlanView } from '../QuarterlyPlanBoardContext';
import { quarterNoteBoxStyle } from '../quarterlyPlanBoardModel';

/** Клик сюда — не «мимо заметки»: тулбар листа и выпадающие списки редактора (цвет, упоминания). */
const EDITOR_SURFACES =
  '[data-card-floating-toolbar], [data-radix-popper-content-wrapper], [role="listbox"], [role="menu"], [role="dialog"]';

interface QuarterlyPlanNoteInlineEditorProps {
  lane: number;
  note: QuarterlyPlanNote;
  /** Где в строке начинаются дорожки заметок. */
  topPx: number;
}

/**
 * Правка заметки прямо в листе на доске — как на доске спринта: тот же редактор и та же капсула
 * под листом (цвет, развернуть в режим фокуса, подтвердить, отменить). ⌘/Ctrl+Enter и клик мимо
 * сохраняют, Escape отменяет; пустой текст не сохраняется.
 */
export const QuarterlyPlanNoteInlineEditor = observer(function QuarterlyPlanNoteInlineEditor({ lane, note, topPx }: QuarterlyPlanNoteInlineEditorProps) {
  const { t } = useI18n();
  const { notes } = useQuarterlyPlanBoard();
  const { editing: noteEditing } = notes;
  const noteEditActions = { cancel: notes.cancel, color: notes.setColor, expand: notes.expand, submit: notes.submit };
  const { memberById, weeks } = useQuarterPlanView();
  const laneHeightPx = useQuarterLaneHeight();
  const isDark = useDocumentDarkClass();
  const rootRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(noteEditing?.value ?? '');
  const color = noteEditing?.color ?? note.color;

  const submit = () => noteEditActions.submit(value);
  const handleOutsidePointerDown = useEffectEvent((target: Element) => {
    if (!rootRef.current?.contains(target) && !target.closest(EDITOR_SURFACES)) submit();
  });
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Element) handleOutsidePointerDown(event.target);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, []);

  return (
    <div
      ref={rootRef}
      className="absolute cursor-text"
      data-quarter-note={note.id}
      // Поверх полос и ячеек недель: клики в лист не должны попадать в доску под ним.
      style={{ ...quarterNoteBoxStyle(note, lane, topPx, weeks.length, laneHeightPx), zIndex: ZIndex.contentInteractive + 2 }}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="sticky-note-paper h-full w-full px-2 py-1" style={getStickyNoteCardStyle(color, isDark)}>
        <StickyNoteRichEditor
          // Текст — сверху слева, как у готовой заметки на этой доске, а не по центру листа.
          className="!items-start !justify-start !text-left text-xs leading-snug [&_.ProseMirror]:!text-left"
          developers={[...memberById.values()]}
          placeholder={t('comments.placeholder')}
          value={value}
          onCancel={noteEditActions.cancel}
          onChange={setValue}
          onSubmit={submit}
        />
      </div>
      <TaskBarDraftSaveButton
        noteEditor={{
          color,
          showDisabledSave: true,
          value,
          onCancel: noteEditActions.cancel,
          onColorChange: noteEditActions.color,
          onSubmit: submit,
        }}
        onNoteExpand={() => noteEditActions.expand(value)}
      />
    </div>
  );
});
