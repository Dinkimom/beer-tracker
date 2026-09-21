'use client';

import type { TaskLayerPositionedTaskItemProps } from './TaskLayer.types';
import type { PhaseSegment } from '@/types';

import { observer } from 'mobx-react-lite';
import React, { useEffect, useMemo } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { useBoards } from '@/features/board/hooks/useBoards';
import { resolveQuickAddDraftQueueKey } from '@/features/board/quickAddQueueOptions';
import {
  DEFAULT_COMMENT_CARD_ROW_HEIGHT,
  isSwimlaneCommentTask,
  isSwimlaneDiagramTask,
  parseSwimlaneCommentTaskId,
} from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { isoDateOnlyFromWorkingDayIndex } from '@/features/swimlane/utils/availabilityTimelineMarks';
import {
  computeSwimlaneLinkAlreadyExists,
  computeSwimlaneValidLinkTargetByTime,
  resolveSwimlanePlacementLinkMode,
} from '@/features/swimlane/utils/swimlaneLinkingHelpers';
import { TaskBar } from '@/features/task/components/TaskBar/TaskBar';
import { TaskCardSwimlaneDiagramDraftContext } from '@/features/task/components/TaskCard/components/TaskCardSwimlaneDiagramDraftContext';
import { TaskCardSwimlaneImageDraftContext } from '@/features/task/components/TaskCard/components/TaskCardSwimlaneImageDraftContext';
import { useSprintCardPresenceViewers } from '@/features/task/components/TaskCard/SprintCardPresenceContext';
import {
  resolveStickyNoteEffectiveCardRowLayout,
  resolveStickyNoteSwimlaneRowBandStyle,
} from '@/features/task/utils/stickyNoteCardRowResizeHelpers';
import { isSwimlaneImageTask } from '@/features/task/utils/swimlaneImageTask';
import { parseStickyNoteColor } from '@/lib/comments/stickyNoteColor';
import { useRootStore } from '@/lib/layers';
import { formatOccupancyErrorTooltip } from '@/lib/planner-timeline';
import { remotePresenceNotePreview } from '@/lib/realtime/sprintPresenceGesture';
import { getBrowserRealtimeClientId } from '@/lib/realtime/sprintRealtimeClientId';

import {
  buildInlineDiagramDraftEditor,
  buildInlineImageDraftEditor,
  isInlineDiagramCreateDraft,
  isInlineImageCreateDraft,
  isInlineNoteCreateDraft,
  isInlineNoteEdit,
  resolvePlanSegmentInlineNoteEditor,
  resolveTaskLayerPlanSegmentRenderState,
  resolveTaskWithNoteEditPreview,
  usesIndependentSwimlaneCardRowBand,
} from './taskLayerPlanSegmentItemHelpers';
import { buildTaskLayerPlanSegmentQuickAddMenu } from './taskLayerPlanSegmentQuickAddMenu';

const EMPTY_QUICK_ADD_EXCLUDED_ISSUE_KEYS = new Set<string>();
const EMPTY_TASK_LINKS: Array<{ fromTaskId: string; toTaskId: string; id: string }> = [];

interface TaskLayerPlanSegmentItemProps {
  activeDraggableId: string | null;
  cardOpacity: number;
  hasMultiplePlanSegments: boolean;
  hasQuickAddDraftMode: boolean;
  hideOtherSegmentsWhileDragging: boolean;
  isDraggingTask: boolean;
  planSegments: PhaseSegment[];
  props: TaskLayerPositionedTaskItemProps;
  seg: PhaseSegment;
  segIdx: number;
  segmentEditorActive: boolean;
  swimlaneRowBandStyle: React.CSSProperties;
}

export const TaskLayerPlanSegmentItem = observer(function TaskLayerPlanSegmentItem({
  activeDraggableId,
  cardOpacity,
  hasMultiplePlanSegments,
  hasQuickAddDraftMode,
  hideOtherSegmentsWhileDragging,
  isDraggingTask,
  planSegments,
  props,
  seg,
  segIdx,
  segmentEditorActive,
  swimlaneRowBandStyle,
}: TaskLayerPlanSegmentItemProps) {
  const {
    contextMenuBlurOtherCards = false,
    contextMenuTaskId,
    developers,
    errorReasons,
    globalNameFilter,
    hasTaskOverlaps,
    layerHeight,
    onCancelQuickAddDraft,
    onCommentDelete,
    onCommentCardRowLayoutUpdate,
    onCommentUpdate,
    onContextMenu,
    onCreateQATask,
    onPasteQuickAddNote,
    onQuickAddDraftAssigneeChange,
    onQuickAddDraftCommentColorChange,
    onQuickAddDraftImageUrlChange,
    onQuickAddDraftKindChange,
    onQuickAddDraftParentChange,
    onQuickAddDraftQueueChange,
    onQuickAddDraftTitleChange,
    onQuickAddDraftTypeChange,
    onSelectExistingQuickAddDraft,
    onSubmitQuickAddCommentDraft,
    onSubmitQuickAddDiagramDraft,
    onSubmitQuickAddImageDraft,
    onSubmitQuickAddDraft,
    onTaskClick,
    onTaskHover,
    onTaskResize,
    position,
    quickAddBoardId = null,
    quickAddExcludedIssueKeys,
    quickAddParentSelectOptions = [],
    quickAddQueueOptions = [],
    qaTasksMap,
    requestArrowRedraw,
    linkingFromTaskId = null,
    linkSourceEndCell = null,
    selectedSprintId,
    selectedTaskId,
    sprintStartDate,
    sprintTimelineWorkingDays,
    task,
    taskBandTotalHeight,
    taskLayerMap,
    taskLinks = EMPTY_TASK_LINKS,
    taskPositions,
    timelineTotalParts,
    stickyNoteCardRowById,
  } = props;
  const { t } = useI18n();
  const sprintPlannerUi = useRootStore().sprintPlannerUi;
  const noteComposer = sprintPlannerUi.noteComposer;
  const cardPresenceViewers = useSprintCardPresenceViewers(task.id);
  const remoteNote = remotePresenceNotePreview(
    cardPresenceViewers,
    task.id,
    getBrowserRealtimeClientId() || null
  );
  const displayTask = resolveTaskWithNoteEditPreview(
    resolveTaskWithNoteEditPreview(task, sprintPlannerUi.noteEditPreview),
    remoteNote
  );
  const inlineNoteDraft = isInlineNoteCreateDraft(task, noteComposer);
  const inlineNoteEdit = isInlineNoteEdit(task, noteComposer);
  const inlineImageDraft = isInlineImageCreateDraft(task);
  const inlineDiagramDraft = isInlineDiagramCreateDraft(task);

  useEffect(() => {
    if (!inlineNoteDraft || !onQuickAddDraftCommentColorChange) {
      return;
    }
    const toolColor = sprintPlannerUi.stickyNoteColor;
    if (parseStickyNoteColor(task.stickyNoteColor) === toolColor) {
      return;
    }
    onQuickAddDraftCommentColorChange(task.id, toolColor);
  }, [
    inlineNoteDraft,
    onQuickAddDraftCommentColorChange,
    sprintPlannerUi.stickyNoteColor,
    task.id,
    task.stickyNoteColor,
  ]);

  const inlineTitleEditor = useMemo(
    () =>
      resolvePlanSegmentInlineNoteEditor({
        closeNoteComposer: sprintPlannerUi.closeNoteComposer,
        displayColor: displayTask.stickyNoteColor,
        displayText: displayTask.name ?? '',
        isCreateDraft: inlineNoteDraft,
        isEdit: inlineNoteEdit,
        placeholder: t('sprintPlanner.swimlane.placementToolbar.notePlaceholder'),
        taskId: task.id,
        toolColor: sprintPlannerUi.stickyNoteColor,
        onCancelDraft: onCancelQuickAddDraft,
        onCreateColorChange: onQuickAddDraftCommentColorChange,
        onCreateTextChange: onQuickAddDraftTitleChange,
        onEditColorChange: (taskId, color) => sprintPlannerUi.setNoteEditPreview(taskId, { color }),
        onEditTextChange: (taskId, title) => sprintPlannerUi.setNoteEditPreview(taskId, { text: title }),
        onSubmit: onSubmitQuickAddCommentDraft,
      }),
    [
      displayTask.name,
      displayTask.stickyNoteColor,
      inlineNoteDraft,
      inlineNoteEdit,
      onCancelQuickAddDraft,
      onQuickAddDraftCommentColorChange,
      onQuickAddDraftTitleChange,
      onSubmitQuickAddCommentDraft,
      sprintPlannerUi,
      t,
      task.id,
    ]
  );
  const imageDraftEditor = useMemo(() => {
    if (
      !inlineImageDraft ||
      !onCancelQuickAddDraft ||
      !onQuickAddDraftImageUrlChange ||
      !onQuickAddDraftTitleChange ||
      !onSubmitQuickAddImageDraft
    ) {
      return null;
    }
    return buildInlineImageDraftEditor({
      caption: displayTask.name ?? '',
      imageUrl: displayTask.imageUrl,
      isSubmitting: false,
      taskId: task.id,
      onCancel: onCancelQuickAddDraft,
      onCaptionChange: onQuickAddDraftTitleChange,
      onImageUrlChange: onQuickAddDraftImageUrlChange,
      onSubmit: onSubmitQuickAddImageDraft,
    });
  }, [
    displayTask.imageUrl,
    displayTask.name,
    inlineImageDraft,
    onCancelQuickAddDraft,
    onQuickAddDraftImageUrlChange,
    onQuickAddDraftTitleChange,
    onSubmitQuickAddImageDraft,
    task.id,
  ]);
  const diagramDraftEditor = useMemo(() => {
    if (
      !inlineDiagramDraft ||
      !onCancelQuickAddDraft ||
      !onQuickAddDraftTitleChange ||
      !onSubmitQuickAddDiagramDraft
    ) {
      return null;
    }
    return buildInlineDiagramDraftEditor({
      caption: displayTask.name ?? '',
      isSubmitting: false,
      taskId: task.id,
      onCancel: onCancelQuickAddDraft,
      onCaptionChange: onQuickAddDraftTitleChange,
      onSubmit: onSubmitQuickAddDiagramDraft,
    });
  }, [
    displayTask.name,
    inlineDiagramDraft,
    onCancelQuickAddDraft,
    onQuickAddDraftTitleChange,
    onSubmitQuickAddDiagramDraft,
    task.id,
  ]);
  const { getQueueByBoardId } = useBoards();
  const teamQueueKey = getQueueByBoardId(quickAddBoardId);

  const renderState = resolveTaskLayerPlanSegmentRenderState({
    activeDraggableId,
    cardOpacity,
    hasMultiplePlanSegments,
    hasQuickAddDraftMode: hasQuickAddDraftMode || noteComposer != null,
    hideOtherSegmentsWhileDragging,
    isComposerTarget: noteComposer?.taskId === task.id,
    planSegmentsLength: planSegments.length,
    props,
    seg,
    segIdx,
    segmentEditorActive,
    taskId: task.id,
    timelineTotalParts,
  });

  const linkMode = resolveSwimlanePlacementLinkMode({
    linkAlreadyExists: computeSwimlaneLinkAlreadyExists(
      linkingFromTaskId,
      task.id,
      taskLinks
    ),
    linkToolArmed: sprintPlannerUi.placementTool === 'link',
    linkingFromTaskId,
    segmentEditorActive,
    taskId: task.id,
    validTargetByTime: computeSwimlaneValidLinkTargetByTime(
      taskPositions.get(task.id),
      linkSourceEndCell
    ),
  });
  const linkingActive = linkingFromTaskId != null || sprintPlannerUi.placementTool === 'link';

  const quickAddMenu = buildTaskLayerPlanSegmentQuickAddMenu({
    availabilityStartDate:
      isoDateOnlyFromWorkingDayIndex(
        sprintStartDate,
        position.startDay,
        sprintTimelineWorkingDays
      ) ?? undefined,
    draftIssueType: task.type?.trim() || 'task',
    draftParentKey: task.parent?.key?.trim() || '',
    draftQueueKey: resolveQuickAddDraftQueueKey(
      task.trackerQueue,
      teamQueueKey,
      quickAddQueueOptions[0]?.key
    ),
    isQuickAddSubmitting: renderState.isQuickAddSubmitting,
    noteComposer,
    onCancelQuickAddDraft,
    onPasteQuickAddNote,
    onQuickAddDraftAssigneeChange,
    onQuickAddDraftCommentColorChange,
    onQuickAddDraftImageUrlChange,
    onQuickAddDraftKindChange,
    onQuickAddDraftParentChange,
    onQuickAddDraftQueueChange,
    onQuickAddDraftTitleChange,
    onQuickAddDraftTypeChange,
    onSelectExistingQuickAddDraft,
    onSubmitQuickAddDraft,
    developers,
    laneAssigneeId: position.assignee,
    planSegmentsLength: planSegments.length,
    quickAddBoardId,
    quickAddExcludedIssueKeys: quickAddExcludedIssueKeys ?? EMPTY_QUICK_ADD_EXCLUDED_ISSUE_KEYS,
    quickAddParentSelectOptions,
    quickAddQueueOptions,
    segIdx,
    segmentEditorActive,
    task,
  });

  const assignedTaskLayer = taskLayerMap.get(task.id) ?? 0;
  const isStickyNoteCard =
    !isSwimlaneImageTask(task) &&
    !isSwimlaneDiagramTask(task) &&
    isSwimlaneCommentTask(task);
  const isPhotoCard = isSwimlaneImageTask(task);
  const cardRowPreview =
    sprintPlannerUi.stickyNoteCardRowPreview?.taskId === task.id
      ? sprintPlannerUi.stickyNoteCardRowPreview
      : null;
  const cardRowOverride =
    cardRowPreview ??
    stickyNoteCardRowById?.get(task.id) ??
    sprintPlannerUi.getStickyNoteCardRowOverride(task.id);
  const committedCardRowLayout = resolveStickyNoteEffectiveCardRowLayout(
    cardRowOverride ??
      (isPhotoCard ? { layerShiftUp: 0, span: DEFAULT_COMMENT_CARD_ROW_HEIGHT } : undefined)
  );
  const rowBandStyle = usesIndependentSwimlaneCardRowBand({
    hasCardRowOverride: cardRowOverride != null,
    isDiagramCard: isSwimlaneDiagramTask(task),
    isPhotoCard,
    isStickyNoteCard,
  })
    ? resolveStickyNoteSwimlaneRowBandStyle({
        assignedTaskLayer,
        cardRowLayout: committedCardRowLayout,
        defaultBandStyle: swimlaneRowBandStyle,
        hasTaskOverlaps,
        layerHeight,
        taskBandTotalHeight,
        usesCardRowBandLayout: true,
      })
    : swimlaneRowBandStyle;

  return (
    <TaskCardSwimlaneDiagramDraftContext.Provider
      key={renderState.fragmentKey}
      value={
        diagramDraftEditor
          ? { ...diagramDraftEditor, isSubmitting: renderState.isQuickAddSubmitting }
          : null
      }
    >
    <TaskCardSwimlaneImageDraftContext.Provider
      value={
        imageDraftEditor
          ? { ...imageDraftEditor, isSubmitting: renderState.isQuickAddSubmitting }
          : null
      }
    >
      <TaskBar
        assigneeName={position.assignee}
        contextMenuBlurOtherCards={contextMenuBlurOtherCards}
        contextMenuTaskId={contextMenuTaskId}
        developers={developers}
        disableDragAndResize={linkingActive}
        disableResize={renderState.interactionDisabled || linkingActive}
        draggableId={renderState.draggableId}
        duration={seg.duration}
        errorTooltip={formatOccupancyErrorTooltip(errorReasons?.get(task.id))}
        globalNameFilter={globalNameFilter}
        htmlAnchorId={renderState.htmlAnchorId}
        inlineTitleEditor={inlineTitleEditor}
        interactionDisabled={renderState.interactionDisabled}
        isInError={renderState.isInError}
        isSelected={selectedTaskId === task.id}
        leftPercent={renderState.leftPercent}
        linkMode={linkMode}
        qaTasksMap={qaTasksMap}
        quickAddMenu={quickAddMenu}
        quickAddSubmitting={renderState.isQuickAddSubmitting}
        requestArrowRedraw={requestArrowRedraw}
        selectedSprintId={selectedSprintId}
        selectedTaskId={selectedTaskId}
        stickyNoteCardRowResize={
          isStickyNoteCard || isPhotoCard
            ? {
                assignedTaskLayer,
                committedCardRowLayout,
                hasTaskOverlaps,
                layerHeight,
                onLayoutCommit: (layout) => {
                  const commentId = parseSwimlaneCommentTaskId(task.id);
                  if (commentId && onCommentCardRowLayoutUpdate) {
                    onCommentCardRowLayoutUpdate(commentId, layout);
                  }
                },
                taskBandTotalHeight,
              }
            : undefined
        }
        style={{
          ...rowBandStyle,
          opacity: renderState.segmentOpacity,
          pointerEvents: renderState.hideSegWhileDragging ? 'none' : undefined,
          transition: 'opacity 0.2s ease',
        }}
        swimlaneBarDurationParts={seg.duration}
        swimlaneDragActive={isDraggingTask}
        swimlaneSegmentBadge={renderState.segmentBadge}
        swimlaneSegmentSecondary={renderState.segmentSecondary}
        swimlaneTimelineTotalParts={timelineTotalParts}
        task={displayTask}
        taskPositions={taskPositions}
        widthPercent={renderState.widthPercent}
        onClick={onTaskClick}
        onCommentDelete={linkingActive ? undefined : onCommentDelete}
        onCommentUpdate={linkingActive ? undefined : onCommentUpdate}
        onContextMenu={linkingActive ? undefined : onContextMenu}
        onCreateQATask={linkingActive ? undefined : onCreateQATask}
        onDeleteLocalImage={linkingActive ? undefined : onCancelQuickAddDraft}
        onResize={(params) =>
          onTaskResize(task.id, {
            ...params,
            planSegmentIndex: hasMultiplePlanSegments ? segIdx : undefined,
          })
        }
        onTaskHover={onTaskHover}
      />
    </TaskCardSwimlaneImageDraftContext.Provider>
    </TaskCardSwimlaneDiagramDraftContext.Provider>
  );
});
