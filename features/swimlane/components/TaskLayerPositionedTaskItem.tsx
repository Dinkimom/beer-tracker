/**
 * Одна позиционированная задача в слое свимлейна (бар + baseline + редактор сегментов).
 */

'use client';

import type { TaskLayerPositionedTaskItemProps } from './TaskLayer.types';

import React from 'react';

import { ZIndex } from '@/constants';
import { SwimlaneLinkingSourceFrame } from '@/features/swimlane/components/SwimlaneLinkingSourceFrame';
import { SwimlaneLinkingTargetOutline } from '@/features/swimlane/components/SwimlaneLinkingTargetOutline';
import { SwimlaneSegmentEditFrame } from '@/features/swimlane/components/SwimlaneSegmentEditFrame';
import {
  computeSwimlaneLinkAlreadyExists,
  computeSwimlaneValidLinkTargetByTime,
  isSwimlaneCardContextLinking,
  resolveSwimlaneLinkingOutlineRadiusClass,
  resolveSwimlanePlacementLinkMode,
} from '@/features/swimlane/utils/swimlaneLinkingHelpers';
import { useRootStore } from '@/lib/layers';
import { getSegmentEditorRangeAndCells } from '@/lib/planner-timeline';

import { TaskLayerOverdueBaselineStrips } from './TaskLayerOverdueBaselineStrips';
import { TaskLayerPlanSegmentItem } from './TaskLayerPlanSegmentItem';
import { resolveTaskLayerPlanContext } from './taskLayerPositionedTaskItemHelpers';

const EMPTY_TASK_LINKS: Array<{ fromTaskId: string; toTaskId: string; id: string }> = [];

export function TaskLayerPositionedTaskItem(props: TaskLayerPositionedTaskItemProps) {
  const {
    activeDraggableId = null,
    currentCell,
    hasQuickAddDraftMode = false,
    hoveredTaskId = null,
    isDark,
    isDraggingTask = false,
    linkingFromTaskId = null,
    linkSourceEndCell = null,
    onSegmentEditCancel,
    onSegmentEditSave,
    position,
    segmentEditDraftCells,
    task,
    taskLinks = EMPTY_TASK_LINKS,
    taskPositions,
    timelineTotalParts,
  } = props;

  const { sprintPlannerUi } = useRootStore();

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
  } = resolveTaskLayerPlanContext(props);

  const linkingActive =
    linkingFromTaskId != null || sprintPlannerUi.placementTool === 'link';

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

  const linkingRange =
    linkMode != null ? getSegmentEditorRangeAndCells(position) : null;
  const linkingOverlayStyle = {
    ...swimlaneRowBandStyle,
    zIndex: ZIndex.arrowsHovered,
  };
  const linkingOutlineRadiusClass = resolveSwimlaneLinkingOutlineRadiusClass(task);
  const showSourceCancel = isSwimlaneCardContextLinking(
    linkingFromTaskId,
    sprintPlannerUi.placementTool === 'link'
  );

  return (
    <React.Fragment>
      {!isDraggingThisTask && (
        <TaskLayerOverdueBaselineStrips
          activeTaskDuration={props.activeTaskDuration ?? null}
          assigneeId={position.assignee}
          baselineHeight={baselineHeight}
          baselineTop={baselineTop}
          currentCell={currentCell}
          hoveredCell={props.hoveredCell ?? null}
          hoveredTaskId={props.hoveredTaskId ?? null}
          isDark={isDark}
          isDraggingTask={props.isDraggingTask ?? false}
          linkingActive={linkingActive}
          strips={overdueBaselineStrips}
          taskId={task.id}
          timelineTotalParts={timelineTotalParts}
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
          totalCells={segmentEditRange.totalCells}
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
              ? () => sprintPlannerUi.setLinkingFromTaskId(null)
              : undefined
          }
        />
      )}
      {linkMode === 'target' && linkingRange && hoveredTaskId === task.id && (
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
}
