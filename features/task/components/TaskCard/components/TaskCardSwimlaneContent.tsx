'use client';

import type { TaskCardSlotItemContext } from '@/features/task/components/TaskCard/slots/taskCardSlotItemContext';
import type { ResolvedTaskCardSlotItem } from '@/lib/taskCard/taskCardSlots';
import type { Developer, Task } from '@/types';

import { TaskCardSwimlaneInlineEditor } from './TaskCardSwimlaneInlineEditor';
import { TaskCardSwimlaneReadOnlyContent } from './TaskCardSwimlaneReadOnlyContent';

interface TaskCardSwimlaneContentProps {
  developers?: readonly Developer[];
  displayId: string;
  inlineTitleEditor?: {
    onChange: (value: string) => void;
    onSubmit?: () => void;
    value: string;
  };
  isDragging: boolean;
  lineHeightClass: string;
  maxLines: number;
  slotContext?: TaskCardSlotItemContext;
  task: Task;
  teamTextColor: string;
  textRef: React.RefObject<HTMLDivElement | null>;
  textSize: string;
  titleEditorClassName: string;
  titleInputRef: React.RefObject<HTMLTextAreaElement | null>;
  titleLeadItems?: readonly ResolvedTaskCardSlotItem[];
  onCommentUpdate?: (commentId: string, text: string) => void;
  onTitleChange: (value: string, selection: { end: number; start: number }) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

export function TaskCardSwimlaneContent({
  developers,
  displayId,
  inlineTitleEditor,
  isDragging,
  lineHeightClass,
  maxLines,
  onCommentUpdate,
  onTitleChange,
  task,
  teamTextColor,
  textRef,
  slotContext,
  textSize,
  titleEditorClassName,
  titleInputRef,
  titleLeadItems = [],
  t,
}: TaskCardSwimlaneContentProps) {
  if (inlineTitleEditor) {
    return (
      <TaskCardSwimlaneInlineEditor
        developers={developers}
        inlineTitleEditor={inlineTitleEditor}
        lineHeightClass={lineHeightClass}
        slotContext={slotContext}
        task={task}
        teamTextColor={teamTextColor}
        textSize={textSize}
        titleEditorClassName={titleEditorClassName}
        titleInputRef={titleInputRef}
        titleLeadItems={titleLeadItems}
        onTitleChange={onTitleChange}
      />
    );
  }

  return (
    <TaskCardSwimlaneReadOnlyContent
      displayId={displayId}
      isDragging={isDragging}
      lineHeightClass={lineHeightClass}
      maxLines={maxLines}
      slotContext={slotContext}
      t={t}
      task={task}
      teamTextColor={teamTextColor}
      textRef={textRef}
      textSize={textSize}
      titleLeadItems={titleLeadItems}
      onCommentUpdate={onCommentUpdate}
    />
  );
}
