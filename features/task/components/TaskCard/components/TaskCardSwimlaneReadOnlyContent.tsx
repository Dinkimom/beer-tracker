'use client';

import type { TaskCardSlotItemContext } from '@/features/task/components/TaskCard/slots/taskCardSlotItemContext';
import type { ResolvedTaskCardSlotItem } from '@/lib/taskCard/taskCardSlots';
import type { Task } from '@/types';

import { StickyNoteTextContent } from '@/features/comments/components/StickyNoteTextContent';
import { STICKY_NOTE_CONTENT_DATA_ATTR } from '@/features/comments/utils/stickyNoteCommentContentOverflow';
import {
  getStickyNoteContentLayoutClass,
  getStickyNoteMarkdownLayoutClass,
  getStickyNoteTextClass,
} from '@/features/comments/utils/stickyNoteSurfaceClasses';
import { parseSwimlaneCommentTaskId } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { MarkdownChecklistPreview } from '@/features/markdown/components/MarkdownChecklistPreview';
import { stickyNoteUsesMarkdownLayout } from '@/lib/markdown/markdownChecklist';

import { TaskCardSlotItems } from '../slots/TaskCardSlotItems';

import {
  resolveTaskCardTitleText,
  TASK_CARD_TITLE_DATA_ATTR,
} from './taskCardContentHelpers';

interface TaskCardSwimlaneReadOnlyContentProps {
  displayId: string;
  isDragging: boolean;
  lineHeightClass: string;
  maxLines: number;
  slotContext?: TaskCardSlotItemContext;
  task: Task;
  teamTextColor: string;
  textRef: React.RefObject<HTMLDivElement | null>;
  textSize: string;
  titleLeadItems?: readonly ResolvedTaskCardSlotItem[];
  onCommentUpdate?: (commentId: string, text: string) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

export function TaskCardSwimlaneReadOnlyContent({
  displayId,
  isDragging,
  lineHeightClass,
  maxLines,
  onCommentUpdate,
  slotContext,
  t,
  task,
  teamTextColor,
  textRef,
  textSize,
  titleLeadItems = [],
}: TaskCardSwimlaneReadOnlyContentProps) {
  const isCommentCard = task.localDraftKind === 'comment';
  // Драфт агента удаляет заметку — зачёркиваем, пока его не примут или не отклонят.
  const strikeClass = task.pendingDelete === true ? ' line-through' : '';
  const titleFontClass = `${isCommentCard ? getStickyNoteTextClass() : 'font-bold'}${strikeClass}`;
  const resolvedTitle = resolveTaskCardTitleText(task, t);
  const slotItemContext: TaskCardSlotItemContext = {
    ...slotContext,
    displayId,
    isDragging,
  };

  if (isCommentCard) {
    if (typeof resolvedTitle !== 'string') {
      return (
        <div
          ref={textRef}
          className={`${textSize} ${lineHeightClass} break-words ${teamTextColor} ${getStickyNoteContentLayoutClass()}`}
          {...{ [STICKY_NOTE_CONTENT_DATA_ATTR]: '' }}
        >
          <span className={`${titleFontClass} pb-px`}>{resolvedTitle}</span>
        </div>
      );
    }

    const noteText = resolvedTitle;
    const commentId = parseSwimlaneCommentTaskId(task.id);

    if (stickyNoteUsesMarkdownLayout(noteText)) {
      return (
        <div
          ref={textRef}
          className={`${textSize} ${lineHeightClass} ${teamTextColor} ${getStickyNoteMarkdownLayoutClass()}${strikeClass}`}
          data-sticky-note-markdown="true"
          {...{ [STICKY_NOTE_CONTENT_DATA_ATTR]: '' }}
        >
          <MarkdownChecklistPreview
            isDragging={isDragging}
            markdown={noteText}
            variant="card"
            onMarkdownChange={
              commentId && onCommentUpdate
                ? (next) => {
                    onCommentUpdate(commentId, next);
                  }
                : undefined
            }
          />
        </div>
      );
    }

    return (
      <div
        ref={textRef}
        className={`${textSize} ${lineHeightClass} break-words ${teamTextColor} ${getStickyNoteContentLayoutClass()}`}
        {...{ [STICKY_NOTE_CONTENT_DATA_ATTR]: '' }}
      >
        <span
          className={`${titleFontClass} pb-px`}
          data-sticky-note-clamped-text=""
          style={{
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: maxLines,
            overflow: 'hidden',
          }}
        >
          <StickyNoteTextContent isDragging={isDragging} text={noteText} />
        </span>
      </div>
    );
  }

  return (
    <div
      ref={textRef}
      className={`${textSize} ${lineHeightClass} break-words pb-px ${teamTextColor}`}
      {...{ [TASK_CARD_TITLE_DATA_ATTR]: '' }}
      style={{
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: maxLines,
        overflow: 'hidden',
      }}
    >
      <TaskCardSlotItems
        context={slotItemContext}
        flow="inline"
        items={titleLeadItems}
        task={task}
      />
      {titleLeadItems.length > 0 ? ' ' : null}
      <span className={titleFontClass}>
        {resolvedTitle}
      </span>
    </div>
  );
}
