'use client';

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

import {
  buildTaskCardKeyLinkProps,
  resolveTaskCardTitleText,
  TASK_CARD_TITLE_DATA_ATTR,
} from './taskCardContentHelpers';
import { TaskCardSwimlaneMetaIconsRow } from './TaskCardSwimlaneMetaIconsRow';

interface TaskCardSwimlaneReadOnlyContentProps {
  compactKey?: boolean;
  displayId: string;
  inlineIconSize: string;
  isDragging: boolean;
  keyLinkProps: ReturnType<typeof buildTaskCardKeyLinkProps>;
  lineHeightClass: string;
  maxLines: number;
  showKey: boolean;
  showMetaIcons: boolean;
  showPriorityIcon: boolean;
  showTypeIcon: boolean;
  task: Task;
  teamTextColor: string;
  textRef: React.RefObject<HTMLDivElement | null>;
  textSize: string;
  onCommentUpdate?: (commentId: string, text: string) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

export function TaskCardSwimlaneReadOnlyContent({
  compactKey = false,
  displayId,
  inlineIconSize,
  isDragging,
  keyLinkProps,
  lineHeightClass,
  maxLines,
  onCommentUpdate,
  showKey,
  showMetaIcons,
  showPriorityIcon,
  showTypeIcon,
  t,
  task,
  teamTextColor,
  textRef,
  textSize,
}: TaskCardSwimlaneReadOnlyContentProps) {
  const isCommentCard = task.localDraftKind === 'comment';
  const titleFontClass = isCommentCard ? getStickyNoteTextClass() : 'font-bold';
  const resolvedTitle = resolveTaskCardTitleText(task, t);
  const titleText = (
    <>
      {showKey ? ' ' : ''}
      {resolvedTitle}
    </>
  );

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
          className={`${textSize} ${lineHeightClass} ${teamTextColor} ${getStickyNoteMarkdownLayoutClass()}`}
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
      <TaskCardSwimlaneMetaIconsRow
        inlineIconSize={inlineIconSize}
        showMetaIcons={showMetaIcons}
        showPriorityIcon={showPriorityIcon}
        showTypeIcon={showTypeIcon}
        task={task}
      />
      {showKey && (
        <a
          className={`font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer ${lineHeightClass}${compactKey ? ' whitespace-nowrap' : ''}`}
          {...keyLinkProps}
        >
          {displayId}
        </a>
      )}
      <span className={titleFontClass}>
        {titleText}
      </span>
    </div>
  );
}
