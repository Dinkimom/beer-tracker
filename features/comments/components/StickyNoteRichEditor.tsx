'use client';

import type { StickyNoteRichNode } from '@/lib/comments/stickyNoteRichDoc';
import type { Developer } from '@/types';
import type { EditorView } from '@tiptap/pm/view';
import type { SyntheticEvent } from 'react';

import { Slice } from '@tiptap/pm/model';
import { EditorContent, useEditor } from '@tiptap/react';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';

import { useStickyNoteRichEditorMentions } from '@/features/comments/hooks/useStickyNoteRichEditorMentions';
import { createStickyNoteRichEditorExtensions } from '@/features/comments/utils/stickyNoteRichEditorExtensions';
import {
  getStickyNoteEditorLayoutClasses,
  getStickyNoteTextClass,
} from '@/features/comments/utils/stickyNoteSurfaceClasses';
import { CommentMentionSelector } from '@/features/task/components/TaskBar/components/quickAddMenu/CommentMentionSelector';
import {
  parseStickyNoteRichDoc,
  serializeStickyNoteRichDoc,
  STICKY_NOTE_MENTION_NODE,
} from '@/lib/comments/stickyNoteRichDoc';
import { stickyNoteUsesMarkdownLayout } from '@/lib/markdown/markdownChecklist';
import { isTeamSwimlaneAssigneeId } from '@/lib/swimlane/teamSwimlaneAssignee';

interface StickyNoteRichEditorProps {
  /** Размер, интерлиньяж и цвет текста — как у заметки на доске. */
  className?: string;
  developers?: readonly Developer[];
  placeholder?: string;
  value: string;
  onCancel?: () => void;
  onChange: (value: string) => void;
  /** Высота содержимого поменялась (набор, перенос строк, монтирование редактора). */
  onContentResize?: () => void;
  onSubmit?: () => void;
}

/** Вставка текста: строки разбираются как в заметке (`- [ ]` → чекбокс и т.д.). */
function parseClipboardText(text: string, view: EditorView): Slice {
  const doc = view.state.schema.nodeFromJSON(parseStickyNoteRichDoc(text.replace(/\r\n?/g, '\n')));
  return new Slice(
    doc.content,
    doc.firstChild?.isTextblock ? 1 : 0,
    doc.lastChild?.isTextblock ? 1 : 0
  );
}

/** Копирование: тот же текст заметки, а не абзацы через пустую строку. */
function serializeClipboardSlice(slice: Slice): string {
  const content = (slice.content.toJSON() ?? []) as StickyNoteRichNode[];
  const isInline = content.some((node) => node.type === 'text' || node.type === STICKY_NOTE_MENTION_NODE);
  return serializeStickyNoteRichDoc({
    content: isInline ? [{ content, type: 'paragraph' }] : content,
    type: 'doc',
  });
}

function stopBoardEvent(event: SyntheticEvent): void {
  event.stopPropagation();
}

/**
 * WYSIWYG-редактор заметки на Tiptap. Значение — тот же текст заметки (markdown-сабсет):
 * нетронутые строки сохраняются как были, см. `stickyNoteRichDoc`.
 * Esc — отмена, ⌘/Ctrl+Enter — сохранить.
 */
export function StickyNoteRichEditor({
  className = '',
  developers = [],
  placeholder,
  value,
  onCancel,
  onChange,
  onContentResize,
  onSubmit,
}: StickyNoteRichEditorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef(value);
  const callbacksRef = useRef({ onCancel, onChange, onContentResize, onSubmit });
  const mentionKeyDownRef = useRef<(event: KeyboardEvent) => boolean>(() => false);
  const extensions = useMemo(() => createStickyNoteRichEditorExtensions(), []);

  useLayoutEffect(() => {
    callbacksRef.current = { onCancel, onChange, onContentResize, onSubmit };
  });

  const editor = useEditor({
    autofocus: 'end',
    content: parseStickyNoteRichDoc(value),
    editorProps: {
      attributes: {
        'aria-label': placeholder ?? '',
        class: 'sticky-note-rich-editor__content',
        spellcheck: 'false',
      },
      clipboardTextParser: (text, _context, _plain, view) => parseClipboardText(text, view),
      clipboardTextSerializer: serializeClipboardSlice,
      handleKeyDown: (_view, event) => {
        if (mentionKeyDownRef.current(event)) {
          return true;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          callbacksRef.current.onCancel?.();
          return true;
        }
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          callbacksRef.current.onSubmit?.();
          return true;
        }
        return false;
      },
    },
    extensions,
    immediatelyRender: false,
    onUpdate: ({ editor: current }) => {
      const next = serializeStickyNoteRichDoc(current.getJSON());
      if (next === lastValueRef.current) {
        return;
      }
      lastValueRef.current = next;
      callbacksRef.current.onChange(next);
    },
  });

  // Текст поменяли снаружи (развёрнутая копия заметки, правка с другого устройства).
  useEffect(() => {
    if (!editor || value === lastValueRef.current) {
      return;
    }
    lastValueRef.current = value;
    editor.commands.setContent(parseStickyNoteRichDoc(value), { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    const observer = new ResizeObserver(() => callbacksRef.current.onContentResize?.());
    observer.observe(editor.view.dom);
    return () => observer.disconnect();
  }, [editor]);

  const mentionCandidates = useMemo(
    () => developers.filter((developer) => !isTeamSwimlaneAssigneeId(developer.id)),
    [developers]
  );
  const mentions = useStickyNoteRichEditorMentions(editor, mentionCandidates);
  useLayoutEffect(() => {
    mentionKeyDownRef.current = mentions.handleKeyDown;
  });

  const isMarkdown = stickyNoteUsesMarkdownLayout(value);
  const layout = getStickyNoteEditorLayoutClasses(value);

  return (
    <div
      ref={rootRef}
      className={`sticky-note-rich-editor relative ${layout.container} ${className}`}
      data-layout={isMarkdown ? 'markdown' : 'plain'}
      onKeyDown={stopBoardEvent}
      onKeyUp={stopBoardEvent}
      onMouseDown={stopBoardEvent}
      onPointerDown={stopBoardEvent}
    >
      <EditorContent
        className={`pointer-events-auto min-h-0 w-full overflow-y-auto ${isMarkdown ? 'h-full' : 'max-h-full'} ${layout.textareaAlign} ${getStickyNoteTextClass()}`}
        data-note-editor-scroll=""
        editor={editor}
      />
      {value === '' && placeholder ? (
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-0 flex items-center justify-center opacity-50 ${getStickyNoteTextClass()}`}
        >
          {placeholder}
        </span>
      ) : null}
      {mentions.isOpen ? (
        <CommentMentionSelector
          activeIndex={mentions.activeIndex}
          anchorRef={rootRef}
          candidates={mentions.candidates}
          onSelect={mentions.selectDeveloper}
        />
      ) : null}
    </div>
  );
}
