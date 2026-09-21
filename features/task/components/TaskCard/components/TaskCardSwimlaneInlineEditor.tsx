'use client';

import type { Developer, Task } from '@/types';
import type { KeyboardEvent } from 'react';

import { useMemo } from 'react';

import { getStickyNoteContentLayoutClass } from '@/features/comments/utils/stickyNoteSurfaceClasses';
import { CommentMentionSelector } from '@/features/task/components/TaskBar/components/quickAddMenu/CommentMentionSelector';
import { useCommentMentionAutocomplete } from '@/features/task/components/TaskBar/components/quickAddMenu/hooks/useCommentMentionAutocomplete';
import { isTeamSwimlaneAssigneeId } from '@/lib/swimlane/teamSwimlaneAssignee';

import { TaskCardSwimlaneMetaIconsRow } from './TaskCardSwimlaneMetaIconsRow';

interface TaskCardSwimlaneInlineEditorProps {
  developers?: readonly Developer[];
  inlineIconSize: string;
  inlineTitleEditor: {
    placeholder?: string;
    value: string;
    onCancel?: () => void;
    onChange: (value: string) => void;
    onSubmit?: () => void;
  };
  lineHeightClass: string;
  showMetaIcons: boolean;
  showPriorityIcon: boolean;
  showTypeIcon: boolean;
  task: Task;
  teamTextColor: string;
  textSize: string;
  titleEditorClassName: string;
  titleInputRef: React.RefObject<HTMLTextAreaElement | null>;
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
  showMetaIcons,
  showPriorityIcon,
  showTypeIcon,
  task,
  inlineIconSize,
  titleInputRef,
  titleEditorClassName,
  inlineTitleEditor,
  onTitleChange,
}: TaskCardSwimlaneInlineEditorProps) {
  const isCommentCard = task.localDraftKind === 'comment';
  const mentionCandidates = useMemo(
    () =>
      isCommentCard
        ? developers.filter((developer) => !isTeamSwimlaneAssigneeId(developer.id))
        : [],
    [developers, isCommentCard]
  );
  const mention = useCommentMentionAutocomplete({
    developers: mentionCandidates,
    text: inlineTitleEditor.value,
    textareaRef: titleInputRef,
    onTextChange: (value) => {
      const textarea = titleInputRef.current;
      const caret = textarea?.selectionStart ?? value.length;
      onTitleChange(value, {
        start: caret,
        end: textarea?.selectionEnd ?? caret,
      });
    },
  });

  return (
    <div
      className={`${textSize} ${lineHeightClass} ${teamTextColor} ${
        isCommentCard
          ? getStickyNoteContentLayoutClass()
          : 'flex min-h-0 w-full flex-col'}
      }`}
    >
      {!isCommentCard && showMetaIcons && (
        <div className="mb-0.5 shrink-0">
          <TaskCardSwimlaneMetaIconsRow
            inlineIconSize={inlineIconSize}
            showMetaIcons={showMetaIcons}
            showPriorityIcon={showPriorityIcon}
            showTypeIcon={showTypeIcon}
            task={task}
          />
        </div>
      )}
      <textarea
        ref={titleInputRef}
        aria-label={inlineTitleEditor.placeholder}
        className={`${titleEditorClassName}${isCommentCard ? ' placeholder:opacity-50' : ''}`}
        placeholder={inlineTitleEditor.placeholder}
        rows={1}
        spellCheck={isCommentCard ? false : undefined}
        value={inlineTitleEditor.value}
        onChange={(event) => {
          mention.handleTextareaChange(
            event.target.value,
            event.target.selectionStart ?? event.target.value.length
          );
        }}
        onClick={mention.syncCaretFromTextarea}
        onKeyDown={(event) => {
          handleInlineNoteEditorKeyDown({
            event,
            mentionKeyHandled: mention.handleKeyDown(event),
            onCancel: inlineTitleEditor.onCancel,
            onSubmit: inlineTitleEditor.onSubmit,
          });
        }}
        onKeyUp={(event) => {
          event.stopPropagation();
          mention.syncCaretFromTextarea();
        }}
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onSelect={mention.syncCaretFromTextarea}
      />
      {mention.isOpen ? (
        <CommentMentionSelector
          activeIndex={mention.activeIndex}
          anchorRef={titleInputRef}
          candidates={mention.candidates}
          onSelect={mention.selectDeveloper}
        />
      ) : null}
    </div>
  );
}
