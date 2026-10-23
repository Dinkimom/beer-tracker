'use client';

import type { TaskCardSlotItemContext } from '@/features/task/components/TaskCard/slots/taskCardSlotItemContext';
import type { ResolvedTaskCardSlotItem } from '@/lib/taskCard/taskCardSlots';
import type { Developer, Task } from '@/types';
import type { KeyboardEvent } from 'react';

import { StickyNoteRichEditor } from '@/features/comments/components/StickyNoteRichEditor';

import { TaskCardSlotItems } from '../slots/TaskCardSlotItems';

interface TaskCardSwimlaneInlineEditorProps {
  developers?: readonly Developer[];
  inlineTitleEditor: {
    placeholder?: string;
    value: string;
    onCancel?: () => void;
    onChange: (value: string) => void;
    onSubmit?: () => void;
  };
  lineHeightClass: string;
  slotContext?: TaskCardSlotItemContext;
  task: Task;
  teamTextColor: string;
  textSize: string;
  titleEditorClassName: string;
  titleInputRef: React.RefObject<HTMLTextAreaElement | null>;
  titleLeadItems?: readonly ResolvedTaskCardSlotItem[];
  onTitleChange: (value: string, selection: { end: number; start: number }) => void;
}

export function handleInlineNoteEditorKeyDown(input: {
  event: KeyboardEvent<HTMLTextAreaElement>;
  mentionKeyHandled: boolean;
  onCancel?: () => void;
  onSubmit?: () => void;
}): void {
  input.event.stopPropagation();
  if (input.mentionKeyHandled) {
    return;
  }
  if (input.event.key === 'Escape') {
    input.event.preventDefault();
    input.onCancel?.();
    return;
  }
  if (input.event.key === 'Enter' && (input.event.metaKey || input.event.ctrlKey)) {
    input.event.preventDefault();
    input.onSubmit?.();
  }
}

export function TaskCardSwimlaneInlineEditor({
  developers = [],
  textSize,
  lineHeightClass,
  teamTextColor,
  task,
  titleInputRef,
  slotContext,
  titleEditorClassName,
  titleLeadItems = [],
  inlineTitleEditor,
  onTitleChange,
}: TaskCardSwimlaneInlineEditorProps) {
  const isCommentCard = task.localDraftKind === 'comment';
  if (isCommentCard) {
    return (
      <StickyNoteRichEditor
        className={`${textSize} ${lineHeightClass} ${teamTextColor}`}
        developers={developers}
        placeholder={inlineTitleEditor.placeholder}
        value={inlineTitleEditor.value}
        onCancel={inlineTitleEditor.onCancel}
        onChange={inlineTitleEditor.onChange}
        onSubmit={inlineTitleEditor.onSubmit}
      />
    );
  }

  return (
    <div className={`${textSize} ${lineHeightClass} ${teamTextColor} flex min-h-0 w-full flex-col`}>
      {titleLeadItems.length > 0 && slotContext ? (
        <div className="mb-0.5 shrink-0">
          <TaskCardSlotItems context={slotContext} items={titleLeadItems} task={task} />
        </div>
      ) : null}
      <textarea
        ref={titleInputRef}
        aria-label={inlineTitleEditor.placeholder}
        className={titleEditorClassName}
        placeholder={inlineTitleEditor.placeholder}
        rows={1}
        value={inlineTitleEditor.value}
        onChange={(event) => {
          const caret = event.target.selectionStart ?? event.target.value.length;
          onTitleChange(event.target.value, {
            start: caret,
            end: event.target.selectionEnd ?? caret,
          });
        }}
        onKeyDown={(event) => {
          handleInlineNoteEditorKeyDown({
            event,
            mentionKeyHandled: false,
            onCancel: inlineTitleEditor.onCancel,
            onSubmit: inlineTitleEditor.onSubmit,
          });
        }}
        onKeyUp={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      />
    </div>
  );
}
