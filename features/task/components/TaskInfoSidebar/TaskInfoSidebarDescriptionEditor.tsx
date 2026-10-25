'use client';

import type { Editor } from '@tiptap/react';

import { Markdown } from '@tiptap/markdown';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';

import { TaskInfoSidebarDescriptionEditorActions } from '@/features/task/components/TaskInfoSidebar/TaskInfoSidebarDescriptionEditorActions';
import {
  type DescriptionEditorMode,
  TaskInfoSidebarDescriptionToolbar,
} from '@/features/task/components/TaskInfoSidebar/TaskInfoSidebarDescriptionToolbar';
import { TrackerDescriptionBlockExtension } from '@/features/task/components/TaskInfoSidebar/TrackerDescriptionBlockExtension';
import { normalizeEditorMarkdown } from '@/features/task/components/TaskInfoSidebar/trackerDescriptionParse';

/** Общие prose-стили описания задачи в сайдере (view + WYSIWYG). */
const TASK_INFO_DESCRIPTION_PROSE_CLASS =
  'text-base text-gray-800 dark:text-gray-100 break-words leading-relaxed [&_p]:mb-2.5 [&_p:last-child]:mb-0 [&_ul]:mb-2.5 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:mb-2.5 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:my-0.5 [&_strong]:text-gray-900 dark:[&_strong]:text-gray-50 [&_h1]:mb-2.5 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-gray-900 [&_h1]:dark:text-gray-50 [&_h2]:mb-2.5 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h2]:dark:text-gray-50 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h3]:dark:text-gray-50 [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-sm [&_code]:text-gray-900 dark:[&_code]:bg-gray-700 dark:[&_code]:text-gray-100 [&_a]:text-blue-600 [&_a]:hover:underline dark:[&_a]:text-blue-400 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-gray-100 [&_pre]:p-3 [&_pre]:text-sm dark:[&_pre]:bg-gray-700 dark:[&_pre]:text-gray-100 [&_table]:mb-2.5 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-50 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-semibold dark:[&_th]:border-gray-600 dark:[&_th]:bg-gray-700 dark:[&_th]:text-gray-50 [&_td]:border [&_td]:border-gray-300 [&_td]:px-2 [&_td]:py-1 dark:[&_td]:border-gray-600 dark:[&_td]:text-gray-100';

const EDITOR_SURFACE_CLASS =
  `task-info-description-editor ${TASK_INFO_DESCRIPTION_PROSE_CLASS} px-3 py-2 [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[1.5rem] [&_.ProseMirror_p]:whitespace-pre-wrap`;

const MARKDOWN_TEXTAREA_CLASS =
  'w-full resize-none overflow-hidden border-0 bg-transparent px-3 py-2 font-mono text-base leading-relaxed text-gray-900 outline-none dark:text-gray-100';

export interface TaskInfoSidebarDescriptionEditorHandle {
  focus: () => void;
  getMarkdown: () => string;
  setMarkdown: (markdown: string) => void;
}

interface TaskInfoSidebarDescriptionEditorProps {
  ariaLabel: string;
  contentMarkdown: string;
  editable: boolean;
  mode: DescriptionEditorMode;
  saving?: boolean;
  onCancel: () => void;
  onModeChange: (mode: DescriptionEditorMode) => void;
  onSave: () => void;
}

function autosizeTextarea(el: HTMLTextAreaElement | null): void {
  if (!el) {
    return;
  }
  el.style.height = '0px';
  el.style.height = `${el.scrollHeight}px`;
}

function scheduleEditorFocus(editor: Editor): void {
  requestAnimationFrame(() => {
    if (editor.isDestroyed || !editor.isEditable) {
      return;
    }
    editor.commands.focus('end');
  });
}

function createDescriptionExtensions() {
  return [
    StarterKit.configure({
      link: {
        openOnClick: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      },
    }),
    Markdown.configure({
      markedOptions: { gfm: true },
    }),
    TrackerDescriptionBlockExtension,
  ];
}

export const TaskInfoSidebarDescriptionEditor = forwardRef<
  TaskInfoSidebarDescriptionEditorHandle,
  TaskInfoSidebarDescriptionEditorProps
>(function TaskInfoSidebarDescriptionEditor(
  {
    ariaLabel,
    contentMarkdown,
    editable,
    mode,
    saving = false,
    onCancel,
    onModeChange,
    onSave,
  },
  ref
) {
  const onCancelRef = useRef(onCancel);
  const modeRef = useRef(mode);
  const markdownDraftRef = useRef(contentMarkdown);
  const markdownTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [markdownDraft, setMarkdownDraft] = useState(contentMarkdown);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const isWysiwygEditable = editable && !saving && mode === 'wysiwyg';

  const editorProps = useMemo(
    () => ({
      attributes: {
        'aria-label': ariaLabel,
        class: 'outline-none',
      },
      handleKeyDown: (_view: unknown, event: KeyboardEvent) => {
        if (event.key !== 'Escape') {
          return false;
        }
        event.preventDefault();
        onCancelRef.current();
        return true;
      },
    }),
    [ariaLabel]
  );

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: createDescriptionExtensions(),
      content: contentMarkdown,
      contentType: 'markdown',
      editable: isWysiwygEditable,
      editorProps,
    }
  );

  const setEditorMode = (nextMode: DescriptionEditorMode) => {
    if (!editor || nextMode === modeRef.current) {
      return;
    }

    if (nextMode === 'markdown') {
      const current = editor.getMarkdown();
      markdownDraftRef.current = current;
      setMarkdownDraft(current);
    } else {
      editor.commands.setContent(markdownDraftRef.current, {
        contentType: 'markdown',
        emitUpdate: false,
      });
      scheduleEditorFocus(editor);
    }
    onModeChange(nextMode);
  };

  useImperativeHandle(
    ref,
    (): TaskInfoSidebarDescriptionEditorHandle => ({
      focus: () => {
        if (modeRef.current === 'markdown') {
          return;
        }
        editor?.commands.focus('end');
      },
      getMarkdown: () => {
        if (modeRef.current === 'markdown') {
          return markdownDraftRef.current;
        }
        return editor?.getMarkdown() ?? '';
      },
      setMarkdown: (markdown: string) => {
        markdownDraftRef.current = markdown;
        setMarkdownDraft(markdown);
        editor?.commands.setContent(markdown, {
          contentType: 'markdown',
          emitUpdate: false,
        });
      },
    }),
    [editor]
  );

  useEffect(() => {
    if (!editable || mode !== 'markdown') {
      return;
    }
    autosizeTextarea(markdownTextareaRef.current);
  }, [editable, markdownDraft, mode]);

  useEffect(() => {
    if (!editable || mode !== 'markdown') {
      return;
    }
    markdownTextareaRef.current?.focus();
  }, [editable, mode]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    if (editor.isEditable !== isWysiwygEditable) {
      editor.setEditable(isWysiwygEditable);
    }
    if (!isWysiwygEditable) {
      return;
    }
    scheduleEditorFocus(editor);
  }, [editor, isWysiwygEditable]);

  useEffect(() => {
    if (!editor || editable) {
      return;
    }
    markdownDraftRef.current = contentMarkdown;
    if (
      normalizeEditorMarkdown(editor.getMarkdown()) ===
      normalizeEditorMarkdown(contentMarkdown)
    ) {
      return;
    }
    editor.commands.setContent(contentMarkdown, {
      contentType: 'markdown',
      emitUpdate: false,
    });
  }, [contentMarkdown, editable, editor]);

  if (!editor) {
    return <div className={`${EDITOR_SURFACE_CLASS} min-h-[1.5rem]`} />;
  }

  return (
    <div className="flex flex-col">
      {editable ? (
        <TaskInfoSidebarDescriptionToolbar
          editor={editor as Editor}
          mode={mode}
          onModeChange={setEditorMode}
        />
      ) : null}
      {editable && mode === 'markdown' ? (
        <textarea
          ref={markdownTextareaRef}
          aria-label={ariaLabel}
          className={MARKDOWN_TEXTAREA_CLASS}
          disabled={!editable || saving}
          spellCheck={false}
          value={markdownDraft}
          onChange={(event) => {
            markdownDraftRef.current = event.target.value;
            setMarkdownDraft(event.target.value);
            autosizeTextarea(event.target);
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') {
              return;
            }
            event.preventDefault();
            onCancelRef.current();
          }}
        />
      ) : (
        <EditorContent className={EDITOR_SURFACE_CLASS} editor={editor as Editor} />
      )}
      {editable ? (
        <TaskInfoSidebarDescriptionEditorActions
          disabled={saving}
          onCancel={onCancel}
          onSave={onSave}
        />
      ) : null}
    </div>
  );
});
