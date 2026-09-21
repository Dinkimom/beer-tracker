'use client';

import type { SwimlaneCardFieldsVisibility } from '@/hooks/useLocalStorage';
import type { PlanningPhaseCardColorScheme } from '@/hooks/useLocalStorage';
import type { Developer, Task, TaskCardVariant } from '@/types';

import { useLayoutEffect, useRef, useState } from 'react';

import { Icon } from '@/components/Icon';
import { useIssueTrackerIssueWebUrl } from '@/contexts/IssueTrackerProviderKindContext';
import { useI18n } from '@/contexts/LanguageContext';
import { syncStickyNoteCommentContentOverflowFlag } from '@/features/comments/utils/stickyNoteCommentContentOverflow';
import {
  getStickyNoteTextClass,
  resolveStickyNoteDisplayModes,
} from '@/features/comments/utils/stickyNoteSurfaceClasses';

import { isSwimlaneSingleTimeslotWidth } from '../taskCardLayoutHelpers';

import {
  adjustTaskCardTitleEditorHeight,
  isQuickAddChooserDraft,
  isSidebarTaskCardVariant,
  mergeSwimlaneCardFields,
  resolveSwimlaneDisplayModes,
  resolveTaskCardDisplayId,
  resolveTaskCardSwimlaneContentWrapperClass,
  resolveTaskCardTeamTextColor,
  resolveTaskCardTitleMaxLinesFallback,
} from './taskCardContentHelpers';
import { TaskCardSidebarContent } from './TaskCardSidebarContent';
import { TaskCardSwimlaneContent } from './TaskCardSwimlaneContent';
import { TaskCardSwimlaneDiagramContent } from './TaskCardSwimlaneDiagramContent';
import { TaskCardSwimlaneImageContent } from './TaskCardSwimlaneImageContent';
import { useTaskCardKeyLinkProps } from './useTaskCardKeyLinkProps';
import { useTaskCardTitleEditorEffects } from './useTaskCardTitleEditorEffects';

interface TaskCardContentProps {
  centerTitle?: boolean;
  developers?: readonly Developer[];
  displayDuration: number;
  fontDuration?: number;
  inlineTitleEditor?: {
    onChange: (value: string) => void;
    onSubmit?: () => void;
    value: string;
  };
  isDragging?: boolean;
  isResizing?: boolean;
  phaseCardColorScheme?: PlanningPhaseCardColorScheme;
  swimlaneCardFields?: SwimlaneCardFieldsVisibility;
  task: Task;
  variant?: TaskCardVariant;
  onCommentUpdate?: (commentId: string, text: string) => void;
  onPhotoClick?: () => void;
}

export function TaskCardContent({
  centerTitle = false,
  developers = [],
  task,
  displayDuration,
  fontDuration,
  inlineTitleEditor,
  variant = 'swimlane',
  isDragging = false,
  isResizing = false,
  onPhotoClick,
  onCommentUpdate,
  phaseCardColorScheme = 'status',
  swimlaneCardFields,
}: TaskCardContentProps) {
  const { t } = useI18n();
  const teamTextColor = resolveTaskCardTeamTextColor(task, phaseCardColorScheme);
  const displayId = resolveTaskCardDisplayId(task);
  const trackerUrl = useIssueTrackerIssueWebUrl(displayId);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const pendingTitleEditorSelectionRef = useRef<{ end: number; start: number } | null>(null);
  const packedTitleLines = isSwimlaneSingleTimeslotWidth(displayDuration);
  const [maxLines, setMaxLines] = useState(() =>
    resolveTaskCardTitleMaxLinesFallback(packedTitleLines)
  );

  useTaskCardTitleEditorEffects({
    inlineTitleEditor,
    maxLines,
    pendingTitleEditorSelectionRef,
    setMaxLines,
    textRef,
    titleFitKey: `${task.name}:${displayDuration}`,
    titleInputRef,
    variant,
    wrapperRef,
  });

  const isCommentCard = task.localDraftKind === 'comment';

  useLayoutEffect(() => {
    if (variant !== 'swimlane' || !isCommentCard || inlineTitleEditor) {
      return;
    }
    const contentRoot = textRef.current;
    if (!contentRoot) {
      return;
    }

    const update = () => {
      syncStickyNoteCommentContentOverflowFlag(contentRoot);
    };

    const observer = new ResizeObserver(update);
    observer.observe(contentRoot);
    update();
    return () => observer.disconnect();
  }, [inlineTitleEditor, isCommentCard, maxLines, task.name, variant]);

  const keyLinkProps = useTaskCardKeyLinkProps({
    displayId,
    isDragging,
    t,
    trackerUrl,
  });

  if (isSidebarTaskCardVariant(variant)) {
    return (
      <TaskCardSidebarContent
        displayId={displayId}
        keyLinkProps={keyLinkProps}
        task={task}
        teamTextColor={teamTextColor}
      />
    );
  }

  const { lineHeightClass, textSize } =
    task.localDraftKind === 'comment'
      ? resolveStickyNoteDisplayModes()
      : resolveSwimlaneDisplayModes(fontDuration ?? displayDuration);
  const mergedFields = mergeSwimlaneCardFields(swimlaneCardFields);
  const isDiagramCard = task.localDraftKind === 'diagram';
  const isImageCard = task.localDraftKind === 'image';
  const isChooserDraft = isQuickAddChooserDraft(task);
  const titleFontClass =
    isCommentCard ? getStickyNoteTextClass() : 'font-bold';
  const titleEditorClassName = `pointer-events-auto block w-full min-w-0 resize-none overflow-y-auto bg-transparent outline-none ${titleFontClass} ${textSize} ${lineHeightClass} ${teamTextColor}${isCommentCard ? ' text-center' : ''}`;

  let contentEl: React.ReactNode;
  if (isChooserDraft) {
    contentEl = (
      <div className="flex h-full w-full items-center justify-center">
        <Icon className="h-5 w-5" name="plus" />
      </div>
    );
  } else if (isDiagramCard) {
    contentEl = (
      <TaskCardSwimlaneDiagramContent
        isDragging={isDragging}
        isResizing={isResizing}
        name={task.name}
        namePlaceholder={t('sprintPlanner.swimlane.quickAddMenu.diagramNamePlaceholder')}
        sceneText={task.excalidrawSceneText}
        sceneUrl={task.diagramSceneUrl}
        untitledName={t('sprintPlanner.swimlane.quickAddMenu.diagramUntitledName')}
      />
    );
  } else if (isImageCard) {
    contentEl = (
      <TaskCardSwimlaneImageContent
        caption={task.name?.trim()}
        emptyLabel={t('sprintPlanner.swimlane.quickAddMenu.imageEmptySlot')}
        imageUrl={task.imageUrl}
        isDragging={isDragging}
        isResizing={isResizing}
        onPhotoClick={onPhotoClick}
      />
    );
  } else {
    contentEl = (
      <TaskCardSwimlaneContent
        developers={developers}
        displayDuration={displayDuration}
        displayId={displayId}
        inlineTitleEditor={inlineTitleEditor}
        isDragging={isDragging}
        keyLinkProps={keyLinkProps}
        lineHeightClass={lineHeightClass}
        maxLines={maxLines}
        mergedFields={mergedFields}
        t={t}
        task={task}
        teamTextColor={teamTextColor}
        textRef={textRef}
        textSize={textSize}
        titleEditorClassName={titleEditorClassName}
        titleInputRef={titleInputRef}
        onCommentUpdate={onCommentUpdate}
        onTitleChange={(value, selection) => {
          pendingTitleEditorSelectionRef.current = selection;
          inlineTitleEditor?.onChange(value);
          adjustTaskCardTitleEditorHeight(titleInputRef.current, wrapperRef.current);
        }}
      />
    );
  }

  const wrapperClassName = resolveTaskCardSwimlaneContentWrapperClass({
    centerTitle,
    isCommentCard: isCommentCard || isImageCard || isDiagramCard || isChooserDraft,
  });
  return (
    <div ref={wrapperRef} className={wrapperClassName}>
      {contentEl}
    </div>
  );
}
