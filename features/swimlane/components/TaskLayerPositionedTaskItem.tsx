/**
 * Одна позиционированная задача в слое свимлейна (бар + baseline + редактор сегментов).
 */

'use client';

import type { TaskLayerPositionedTaskItemProps } from './TaskLayer.types';

import { observer } from 'mobx-react-lite';
import React from 'react';

import { ZIndex } from '@/constants';
import { useSprintBoard } from '@/features/sprint/model/SprintBoardContext';
import { SwimlaneLinkingSourceFrame } from '@/features/swimlane/components/SwimlaneLinkingSourceFrame';
import { SwimlaneLinkingTargetOutline } from '@/features/swimlane/components/SwimlaneLinkingTargetOutline';
import { SwimlaneSegmentEditFrame } from '@/features/swimlane/components/SwimlaneSegmentEditFrame';
import { useSwimlaneHighlightSelector } from '@/features/swimlane/SwimlaneBoardContext';
import { extendLastPlanSegmentToCell } from '@/features/swimlane/utils/overdueBaselineSummary';
import {
  computeSwimlaneLinkAlreadyExists,
  computeSwimlaneValidLinkTargetByTime,
  isSwimlaneCardContextLinking,
  resolveSwimlaneLinkingOutlineRadiusClass,
  resolveSwimlanePlacementLinkMode,
} from '@/features/swimlane/utils/swimlaneLinkingHelpers';
import { computeTaskLayerCardOpacity } from '@/features/swimlane/utils/taskLayerTaskLayout';
import { useRootStore } from '@/lib/layers';
import { getSegmentEditorRangeAndCells } from '@/lib/planner-timeline';

import { TaskLayerOverdueBaselineStrips } from './TaskLayerOverdueBaselineStrips';
import { TaskLayerPlanAnchorMarks } from './TaskLayerPlanAnchorMarks';
import { TaskLayerPlanSegmentItem } from './TaskLayerPlanSegmentItem';
import {
  resolveTaskLayerBaselineCenterOffsetPx,
  resolveTaskLayerPlanContext,
} from './taskLayerPositionedTaskItemHelpers';

const EMPTY_TASK_LINKS: Array<{ fromTaskId: string; toTaskId: string; id: string }> = [];

// observer: QA-задачи для отступа бейзлайна читаются из модели доски.
export const TaskLayerPositionedTaskItem = observer(function TaskLayerPositionedTaskItem(
  props: TaskLayerPositionedTaskItemProps
) {
  const { developers, qaTasksMap } = useSprintBoard();
  const {
    activeDraggableId = null,
    currentCell,
    hasQuickAddDraftMode = false,
    isDraggingTask = false,
    linkingFromTaskId = null,
    showLinks = true,
    onSegmentEditCancel,
    onSegmentEditSave,
    onOverdueCloseAndCreate,
    position,
    segmentEditDraftCells,
    task,
    taskLayerMap,
    taskLinks = EMPTY_TASK_LINKS,
    taskPositions,
    timelineTotalParts,
  } = props;

  const { sprintPlannerUi } = useRootStore();
  const hovered = useSwimlaneHighlightSelector(
    (highlight) => highlight.hoveredTaskId === task.id
  );
  const highlightCardOpacity = useSwimlaneHighlightSelector((highlight) =>
    computeTaskLayerCardOpacity({
      activeTask: props.activeTask,
      factHoveredTaskId: highlight.factHoveredTaskId,
      hoverConnectedTaskIds: highlight.hoverConnectedTaskIds,
      onSegmentEditCancel,
      onSegmentEditSave,
      segmentEditTaskId: props.segmentEditTaskId ?? null,
      taskId: task.id,
    })
  );

  const {
    baselineHeight,
    baselineTop,
    cardOpacity,
    effectivelyQa,
    hasMultiplePlanSegments,
    hideOtherSegmentsWhileDragging,
    isDraggingThisTask,
    overdueBaselineStrips,
    planSegments,
    segmentEditRange,
    segmentEditorActive,
    swimlaneRowBandStyle,
  } = resolveTaskLayerPlanContext(props, highlightCardOpacity);

  const baselineCenterOffsetPx = resolveTaskLayerBaselineCenterOffsetPx({
    assigneeOrder: developers,
    baselineHeight,
    qaTasksMap,
    stripCount: overdueBaselineStrips.length,
    taskId: task.id,
    taskLayerMap,
    taskLinks,
    taskPositions,
    userLinksVisible: showLinks,
  });

  const linkingActive =
    linkingFromTaskId != null || sprintPlannerUi.tools.placementTool === 'link';

  const linkMode = resolveSwimlanePlacementLinkMode({
    linkAlreadyExists: computeSwimlaneLinkAlreadyExists(
      linkingFromTaskId,
      task.id,
      taskLinks
    ),
    linkToolArmed: sprintPlannerUi.tools.placementTool === 'link',
    linkingFromTaskId,
    segmentEditorActive,
    taskId: task.id,
    validTargetByTime: computeSwimlaneValidLinkTargetByTime(
      taskPositions.get(task.id),
      linkingFromTaskId ? taskPositions.get(linkingFromTaskId) : undefined
    ),
  });

  const linkingRange =
    linkMode != null ? getSegmentEditorRangeAndCells(position) : null;
  const linkingOverlayStyle = {
    ...swimlaneRowBandStyle,
    zIndex: ZIndex.arrowsHovered,
  };
  const linkingOutlineRadiusClass = resolveSwimlaneLinkingOutlineRadiusClass(task);
  const showSourceCancel = isSwimlaneCardContextLinking(
    linkingFromTaskId,
    sprintPlannerUi.tools.placementTool === 'link'
  );

  return (
    <React.Fragment>
      {!isDraggingThisTask && (
        <TaskLayerPlanAnchorMarks
          focused={hovered}
          position={position}
          rowBandStyle={swimlaneRowBandStyle}
          task={task}
          timelineTotalParts={timelineTotalParts}
        />
      )}
      {!isDraggingThisTask && (
        <TaskLayerOverdueBaselineStrips
          activeTaskDuration={props.activeTaskDuration ?? null}
          assigneeId={position.assignee}
          baselineCenterOffsetPx={baselineCenterOffsetPx}
          baselineHeight={baselineHeight}
          baselineTop={baselineTop}
          currentCell={currentCell}
          isDraggingTask={props.isDraggingTask ?? false}
          linkingActive={linkingActive}
          status={task.status}
          strips={overdueBaselineStrips}
          taskId={task.id}
          timelineTotalParts={timelineTotalParts}
          onCloseAndCreate={
            onOverdueCloseAndCreate
              ? () =>
                  onOverdueCloseAndCreate({
                    currentCell,
                    position,
                    task,
                    timelineTotalParts,
                  })
              : undefined
          }
          onExtend={
            onSegmentEditSave && !segmentEditorActive
              ? () => {
                  const segments = extendLastPlanSegmentToCell(position, currentCell);
                  if (segments) onSegmentEditSave(position, segments, effectivelyQa);
                }
              : undefined
          }
        />
      )}
      {planSegments.map((seg, segIdx) => (
        <TaskLayerPlanSegmentItem
          key={hasMultiplePlanSegments ? `${task.id}-seg-${segIdx}` : task.id}
          activeDraggableId={activeDraggableId}
          cardOpacity={cardOpacity}
          hasMultiplePlanSegments={hasMultiplePlanSegments}
          hasQuickAddDraftMode={hasQuickAddDraftMode}
          hideOtherSegmentsWhileDragging={hideOtherSegmentsWhileDragging}
          isDraggingTask={isDraggingTask}
          planSegments={planSegments}
          props={props}
          seg={seg}
          segIdx={segIdx}
          segmentEditorActive={segmentEditorActive}
          swimlaneRowBandStyle={swimlaneRowBandStyle}
        />
      ))}
      {segmentEditorActive && segmentEditRange && onSegmentEditSave && onSegmentEditCancel && (
        <SwimlaneSegmentEditFrame
          cells={segmentEditDraftCells ?? segmentEditRange.initialCells}
          containerStyle={linkingOverlayStyle}
          initialCells={segmentEditRange.initialCells}
          rangeStartCell={segmentEditRange.rangeStartCell}
          timelineTotalParts={timelineTotalParts}
          onCancel={onSegmentEditCancel}
          onCellsChange={props.setSegmentEditDraftCells}
          onSave={(segments) => {
            onSegmentEditSave(position, segments, effectivelyQa);
          }}
        />
      )}
      {linkMode === 'source' && linkingRange && (
        <SwimlaneLinkingSourceFrame
          containerStyle={linkingOverlayStyle}
          outlineRadiusClass={linkingOutlineRadiusClass}
          rangeStartCell={linkingRange.rangeStartCell}
          timelineTotalParts={timelineTotalParts}
          totalCells={linkingRange.totalCells}
          onCancel={
            showSourceCancel
              ? () => sprintPlannerUi.tools.setLinkingFromTaskId(null)
              : undefined
          }
        />
      )}
      {linkMode === 'target' && linkingRange && hovered && (
        <SwimlaneLinkingTargetOutline
          containerStyle={linkingOverlayStyle}
          outlineRadiusClass={linkingOutlineRadiusClass}
          rangeStartCell={linkingRange.rangeStartCell}
          timelineTotalParts={timelineTotalParts}
          totalCells={linkingRange.totalCells}
        />
      )}
    </React.Fragment>
  );
});
