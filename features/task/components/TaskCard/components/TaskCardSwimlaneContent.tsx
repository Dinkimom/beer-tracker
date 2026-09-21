'use client';

import type { SwimlaneCardFieldsVisibility } from '@/hooks/useLocalStorage';
import type { Developer, Task } from '@/types';

import { isSwimlaneSingleTimeslotWidth } from '../taskCardLayoutHelpers';

import {
  buildTaskCardKeyLinkProps,
  resolveTaskCardSwimlaneMetaVisibility,
} from './taskCardContentHelpers';
import { TaskCardSwimlaneInlineEditor } from './TaskCardSwimlaneInlineEditor';
import { TaskCardSwimlaneReadOnlyContent } from './TaskCardSwimlaneReadOnlyContent';

interface TaskCardSwimlaneContentProps {
  developers?: readonly Developer[];
  displayDuration: number;
  displayId: string;
  inlineTitleEditor?: {
    onChange: (value: string) => void;
    onSubmit?: () => void;
    value: string;
  };
  isDragging: boolean;
  keyLinkProps: ReturnType<typeof buildTaskCardKeyLinkProps>;
  lineHeightClass: string;
  maxLines: number;
  mergedFields: SwimlaneCardFieldsVisibility;
  task: Task;
  teamTextColor: string;
  textRef: React.RefObject<HTMLDivElement | null>;
  textSize: string;
  titleEditorClassName: string;
  titleInputRef: React.RefObject<HTMLTextAreaElement | null>;
  onCommentUpdate?: (commentId: string, text: string) => void;
  onTitleChange: (value: string, selection: { end: number; start: number }) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

export function TaskCardSwimlaneContent({
  developers,
  displayDuration,
  displayId,
  inlineTitleEditor,
  isDragging,
  keyLinkProps,
  lineHeightClass,
  maxLines,
  mergedFields,
  onCommentUpdate,
  onTitleChange,
  task,
  teamTextColor,
  textRef,
  textSize,
  titleEditorClassName,
  titleInputRef,
  t,
}: TaskCardSwimlaneContentProps) {
  const inlineIconSize = 'w-3 h-3';
  const {
    showKey,
    showMetaIcons,
    showPriorityIcon,
    showTypeIcon,
  } = resolveTaskCardSwimlaneMetaVisibility({
    displayDuration,
    mergedFields,
    task,
  });

  if (inlineTitleEditor) {
    return (
      <TaskCardSwimlaneInlineEditor
        developers={developers}
        inlineIconSize={inlineIconSize}
        inlineTitleEditor={inlineTitleEditor}
        lineHeightClass={lineHeightClass}
        showMetaIcons={showMetaIcons}
        showPriorityIcon={showPriorityIcon}
        showTypeIcon={showTypeIcon}
        task={task}
        teamTextColor={teamTextColor}
        textSize={textSize}
        titleEditorClassName={titleEditorClassName}
        titleInputRef={titleInputRef}
        onTitleChange={onTitleChange}
      />
    );
  }

  return (
    <TaskCardSwimlaneReadOnlyContent
      compactKey={isSwimlaneSingleTimeslotWidth(displayDuration)}
      displayId={displayId}
      inlineIconSize={inlineIconSize}
      isDragging={isDragging}
      keyLinkProps={keyLinkProps}
      lineHeightClass={lineHeightClass}
      maxLines={maxLines}
      showKey={showKey}
      showMetaIcons={showMetaIcons}
      showPriorityIcon={showPriorityIcon}
      showTypeIcon={showTypeIcon}
      t={t}
      task={task}
      teamTextColor={teamTextColor}
      textRef={textRef}
      textSize={textSize}
      onCommentUpdate={onCommentUpdate}
    />
  );
}
