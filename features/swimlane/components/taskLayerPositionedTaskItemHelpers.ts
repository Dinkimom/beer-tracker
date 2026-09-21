import type { TaskLayerPositionedTaskItemProps } from './TaskLayer.types';
import type { PhaseSegment } from '@/types';

import { resolveSwimlaneCardLayerSpan } from '@/features/swimlane/utils/layerUtils';
import { getOrderedPlanSegments } from '@/features/swimlane/utils/positionUtils';
import {
  computeSwimlaneBaselineInsetsPx,
  computeSwimlaneOverdueBaselineStrips,
  computeSwimlaneRowBandBox,
  computeTaskLayerCardOpacity,
} from '@/features/swimlane/utils/taskLayerTaskLayout';
import { isEffectivelyQaTask } from '@/features/task/utils/taskUtils';
import { cellsToSegments, getSegmentEditorRangeAndCells } from '@/lib/planner-timeline';

function resolveTaskLayerPlanSegments(
  position: TaskLayerPositionedTaskItemProps['position'],
  segmentEditorActive: boolean,
  segmentEditDraftCells: boolean[] | null
): { planSegments: PhaseSegment[]; segmentEditRange: ReturnType<typeof getSegmentEditorRangeAndCells> | null } {
  const segmentEditRange = segmentEditorActive ? getSegmentEditorRangeAndCells(position) : null;
  const previewCellsForEdit =
    segmentEditorActive && segmentEditRange
      ? (segmentEditDraftCells ?? segmentEditRange.initialCells)
      : null;
  const planSegments =
    previewCellsForEdit !== null && segmentEditRange
      ? cellsToSegments(segmentEditRange.rangeStartCell, previewCellsForEdit)
      : getOrderedPlanSegments(position);

  return { planSegments, segmentEditRange };
}

export function resolveTaskLayerPlanContext(props: TaskLayerPositionedTaskItemProps) {
  const {
    activeDraggableId = null,
    activeTask,
    currentCell,
    factHoveredTaskId = null,
    hasTaskOverlaps,
    hoverConnectedTaskIds = null,
    layerHeight,
    onSegmentEditCancel,
    onSegmentEditSave,
    position,
    segmentEditDraftCells,
    segmentEditTaskId = null,
    stickyNoteCardRowById,
    task,
    taskBandTotalHeight,
    taskLayerMap,
  } = props;

  const segmentEditorActive =
    segmentEditTaskId === task.id && onSegmentEditSave && onSegmentEditCancel;
  const { planSegments, segmentEditRange } = resolveTaskLayerPlanSegments(
    position,
    Boolean(segmentEditorActive),
    segmentEditDraftCells
  );
  const hasMultiplePlanSegments = planSegments.length > 1;
  const overdueBaselineStrips = computeSwimlaneOverdueBaselineStrips(task, planSegments, currentCell);
  const taskLayer = taskLayerMap.get(task.id) ?? 0;
  const layerSpan = resolveSwimlaneCardLayerSpan(task, position, stickyNoteCardRowById);
  const { height: baselineHeight, top: baselineTop } = computeSwimlaneBaselineInsetsPx(
    hasTaskOverlaps,
    taskLayer,
    taskBandTotalHeight,
    layerHeight,
    layerSpan
  );
  const swimlaneRowBandStyle = computeSwimlaneRowBandBox(
    hasTaskOverlaps,
    taskLayer,
    taskBandTotalHeight,
    layerHeight,
    layerSpan
  );
  const isDraggingThisTask = activeTask?.id === task.id;
  const hideOtherSegmentsWhileDragging =
    isDraggingThisTask && activeDraggableId != null && hasMultiplePlanSegments;
  const cardOpacity = computeTaskLayerCardOpacity({
    activeTask,
    factHoveredTaskId,
    hoverConnectedTaskIds,
    onSegmentEditCancel,
    onSegmentEditSave,
    segmentEditTaskId,
    taskId: task.id,
  });

  return {
    baselineHeight,
    baselineTop,
    cardOpacity,
    effectivelyQa: isEffectivelyQaTask(task),
    hasMultiplePlanSegments,
    hideOtherSegmentsWhileDragging,
    isDraggingThisTask,
    overdueBaselineStrips,
    planSegments,
    segmentEditRange,
    segmentEditorActive: Boolean(segmentEditorActive),
    swimlaneRowBandStyle,
  };
}
