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
import { extendLastPlanSegmentToCell } from '@/features/swimlane/utils/overdueBaselineSummary';
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
import { TaskLayerPlanAnchorMarks } from './TaskLayerPlanAnchorMarks';
import { TaskLayerPlanSegmentItem } from './TaskLayerPlanSegmentItem';
import {
  resolveTaskLayerBaselineCenterOffsetPx,
  resolveTaskLayerPlanContext,
} from './taskLayerPositionedTaskItemHelpers';

const EMPTY_TASK_LINKS: Array<{ fromTaskId: string; toTaskId: string; id: string }> = [];

export function TaskLayerPositionedTaskItem(props: TaskLayerPositionedTaskItemProps) {
  const {
    activeDraggableId = null,
    currentCell,
    developers,
    hasQuickAddDraftMode = false,
    hoveredTaskId = null,
    isDraggingTask = false,
    linkingFromTaskId = null,
    linkSourceEndCell = null,
    qaTasksMap,
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
        <TaskLayerPlanAnchorMarks
          focused={hoveredTaskId === task.id}
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
          holidayDayIndices={props.holidayDayIndices}
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
