'use client';

import type { Editor } from '@tiptap/react';

import { useEditorState } from '@tiptap/react';

import { useI18n } from '@/contexts/LanguageContext';
import { TaskInfoSidebarDescriptionLinkControl } from '@/features/task/components/TaskInfoSidebar/TaskInfoSidebarDescriptionLinkControl';
import { TaskInfoSidebarDescriptionToolbarButton } from '@/features/task/components/TaskInfoSidebar/TaskInfoSidebarDescriptionToolbarButton';

export type DescriptionEditorMode = 'markdown' | 'wysiwyg';

interface TaskInfoSidebarDescriptionToolbarProps {
  editor: Editor;
  mode: DescriptionEditorMode;
  onModeChange: (mode: DescriptionEditorMode) => void;
}

export function TaskInfoSidebarDescriptionToolbar({
  editor,
  mode,
  onModeChange,
}: TaskInfoSidebarDescriptionToolbarProps) {
  const { t } = useI18n();
  const formattingEnabled = mode === 'wysiwyg';
  const visualModeOn = mode === 'wysiwyg';

  const active = useEditorState({
    editor,
    selector: (ctx) => ({
      bold: ctx.editor.isActive('bold'),
      bulletList: ctx.editor.isActive('bulletList'),
      code: ctx.editor.isActive('code'),
      codeBlock: ctx.editor.isActive('codeBlock'),
      heading2: ctx.editor.isActive('heading', { level: 2 }),
      heading3: ctx.editor.isActive('heading', { level: 3 }),
      italic: ctx.editor.isActive('italic'),
      orderedList: ctx.editor.isActive('orderedList'),
      quote: ctx.editor.isActive('blockquote'),
      strike: ctx.editor.isActive('strike'),
    }),
  });

  return (
    <div
      aria-label={t('sprintPlanner.taskInfo.descriptionEditor.toolbarAria')}
      className="flex flex-wrap items-center gap-0.5 border-b border-gray-100 px-2 py-1 dark:border-gray-700"
      data-description-editor-chrome=""
      role="toolbar"
    >
      <TaskInfoSidebarDescriptionToolbarButton
        active={formattingEnabled && active.bold}
        disabled={!formattingEnabled}
        icon="bold"
        label={t('sprintPlanner.taskInfo.descriptionEditor.bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <TaskInfoSidebarDescriptionToolbarButton
        active={formattingEnabled && active.italic}
        disabled={!formattingEnabled}
        icon="italic"
        label={t('sprintPlanner.taskInfo.descriptionEditor.italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <TaskInfoSidebarDescriptionToolbarButton
        active={formattingEnabled && active.strike}
        disabled={!formattingEnabled}
        icon="strikethrough"
        label={t('sprintPlanner.taskInfo.descriptionEditor.strikethrough')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      />
      <TaskInfoSidebarDescriptionToolbarButton
        active={formattingEnabled && active.code}
        disabled={!formattingEnabled}
        icon="code"
        label={t('sprintPlanner.taskInfo.descriptionEditor.code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
      />
      <div aria-hidden className="mx-1 h-4 w-px shrink-0 bg-gray-200 dark:bg-gray-700" />
      <TaskInfoSidebarDescriptionToolbarButton
        active={formattingEnabled && active.heading2}
        disabled={!formattingEnabled}
        label={t('sprintPlanner.taskInfo.descriptionEditor.heading2')}
        text="H2"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <TaskInfoSidebarDescriptionToolbarButton
        active={formattingEnabled && active.heading3}
        disabled={!formattingEnabled}
        label={t('sprintPlanner.taskInfo.descriptionEditor.heading3')}
        text="H3"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      />
      <div aria-hidden className="mx-1 h-4 w-px shrink-0 bg-gray-200 dark:bg-gray-700" />
      <TaskInfoSidebarDescriptionToolbarButton
        active={formattingEnabled && active.bulletList}
        disabled={!formattingEnabled}
        icon="list"
        label={t('sprintPlanner.taskInfo.descriptionEditor.bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <TaskInfoSidebarDescriptionToolbarButton
        active={formattingEnabled && active.orderedList}
        disabled={!formattingEnabled}
        icon="list-ordered"
        label={t('sprintPlanner.taskInfo.descriptionEditor.orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <TaskInfoSidebarDescriptionToolbarButton
        active={formattingEnabled && active.quote}
        disabled={!formattingEnabled}
        icon="quote"
        label={t('sprintPlanner.taskInfo.descriptionEditor.quote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      <TaskInfoSidebarDescriptionToolbarButton
        active={formattingEnabled && active.codeBlock}
        disabled={!formattingEnabled}
        icon="code-block"
        label={t('sprintPlanner.taskInfo.descriptionEditor.codeBlock')}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      />
      <TaskInfoSidebarDescriptionLinkControl disabled={!formattingEnabled} editor={editor} />
      <div className="ml-auto">
        <TaskInfoSidebarDescriptionToolbarButton
          active={visualModeOn}
          icon={visualModeOn ? 'eye' : 'eye-off'}
          label={
            visualModeOn
              ? t('sprintPlanner.taskInfo.descriptionEditor.modeVisual')
              : t('sprintPlanner.taskInfo.descriptionEditor.modeMarkdown')
          }
          onClick={() => onModeChange(visualModeOn ? 'markdown' : 'wysiwyg')}
        />
      </div>
    </div>
  );
}
