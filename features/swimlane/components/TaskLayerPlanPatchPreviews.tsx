'use client';

import type { PlanPatchPositionPreview } from '@/lib/sprints/sprintPlanPatchPositionPreview';
import type { Developer, Task } from '@/types';

import { useQueries } from '@tanstack/react-query';
import { observer } from 'mobx-react-lite';
import { useCallback } from 'react';

import { getPartsPerDay } from '@/constants';
import {
  planPatchPreviewElementId,
  planPatchPreviewSegmentHtmlAnchorId,
} from '@/features/swimlane/utils/planPatchPreviewFocus';
import { planPatchPreviewLayerKey } from '@/features/swimlane/utils/planPatchPreviewLayers';
import { getLeftPercentForSegmentStartCell, getWidthPercent } from '@/features/swimlane/utils/positionUtils';
import { computeSwimlaneRowBandBox } from '@/features/swimlane/utils/taskLayerTaskLayout';
import { TaskBar } from '@/features/task/components/TaskBar/TaskBar';
import { getTaskByKey } from '@/lib/api/issues';
import { useRootStore } from '@/lib/layers';

interface TaskLayerPlanPatchPreviewsProps {
  assigneeId: string;
  developers: Developer[];
  globalNameFilter?: string;
  hasTaskOverlaps: boolean;
  layerHeight: number;
  sprintId?: number | null;
  taskBandTotalHeight: number;
  taskLayerMap: Map<string, number>;
  tasksMap: Map<string, Task>;
  timelineTotalParts: number;
}

function noop(): void {
  return undefined;
}

function taskForPlanPatchPreview(task: Task | undefined, taskId: string): Task {
  if (task) {
    return { ...task, pendingApproval: true };
  }
  return { id: taskId, link: '', name: taskId, pendingApproval: true, team: 'Web' };
}

/** Задачи из предложения, которых ещё нет в спринте: подтягиваем карточку по ключу. */
function useMissingPreviewTasks(
  taskIds: readonly string[],
  tasksMap: Map<string, Task>
): Map<string, Task> {
  const missing = taskIds.filter((taskId) => !tasksMap.has(taskId));
  const results = useQueries({
    queries: missing.map((taskId) => ({
      queryFn: () => getTaskByKey(taskId),
      queryKey: ['plan-patch-preview-task', taskId],
      staleTime: 5 * 60 * 1000,
    })),
  });
  const loaded = new Map<string, Task>();
  results.forEach((result, index) => {
    if (result.data) {
      loaded.set(missing[index]!, result.data);
    }
  });
  return loaded;
}

function previewBars(preview: PlanPatchPositionPreview): Array<{
  duration: number;
  key: string;
  startDay: number;
  startPart: number;
}> {
  if (preview.segments && preview.segments.length > 0) {
    return preview.segments.map((segment, index) => ({
      duration: segment.duration,
      key: `${preview.taskId}:seg:${index}`,
      startDay: segment.startDay,
      startPart: segment.startPart,
    }));
  }
  return [
    {
      duration: preview.duration,
      key: preview.taskId,
      startDay: preview.startDay,
      startPart: preview.startPart,
    },
  ];
}

export const TaskLayerPlanPatchPreviews = observer(function TaskLayerPlanPatchPreviews({
  assigneeId,
  developers,
  globalNameFilter,
  hasTaskOverlaps,
  layerHeight,
  sprintId,
  taskBandTotalHeight,
  taskLayerMap,
  tasksMap,
  timelineTotalParts,
}: TaskLayerPlanPatchPreviewsProps) {
  const { sprintPlannerUi, taskPositions } = useRootStore();
  const onTaskHover = useCallback(
    (taskId: string | null) => {
      sprintPlannerUi.setPlanPatchFocusTaskId(taskId);
    },
    [sprintPlannerUi]
  );
  const cards = [...taskPositions.planPatchPreviews.values()].filter(
    (preview) => !preview.remove && preview.assigneeId === assigneeId
  );
  const cardTaskIds = cards.map((preview) => preview.taskId);
  const missingTasks = useMissingPreviewTasks(cardTaskIds, tasksMap);
  if (timelineTotalParts <= 0 || cards.length === 0) {
    return null;
  }
  const partsPerDay = getPartsPerDay();
  return (
    <>
      {cards.flatMap((preview) =>
        previewBars(preview).map((bar, barIndex) => {
          const startCell = bar.startDay * partsPerDay + bar.startPart;
          const isPrimary = barIndex === 0;
          const segmentAnchorId = planPatchPreviewSegmentHtmlAnchorId(preview.taskId, barIndex);
          return (
            <TaskBar
              key={bar.key}
              developers={developers}
              disableDragAndResize
              draggableId={
                isPrimary
                  ? planPatchPreviewElementId(preview.taskId)
                  : `${planPatchPreviewElementId(preview.taskId)}:${barIndex}`
              }
              duration={bar.duration}
              globalNameFilter={globalNameFilter}
              htmlAnchorId={segmentAnchorId}
              leftPercent={getLeftPercentForSegmentStartCell(startCell, timelineTotalParts)}
              planPatchGhost
              requestArrowRedraw={noop}
              selectedSprintId={sprintId}
              style={computeSwimlaneRowBandBox(
                hasTaskOverlaps,
                taskLayerMap.get(planPatchPreviewLayerKey(preview.taskId)) ?? 0,
                taskBandTotalHeight,
                layerHeight
              )}
              swimlaneBarDurationParts={bar.duration}
              swimlaneSegmentSecondary={!isPrimary}
              swimlaneTimelineTotalParts={timelineTotalParts}
              task={taskForPlanPatchPreview(
                tasksMap.get(preview.taskId) ?? missingTasks.get(preview.taskId),
                preview.taskId
              )}
              widthPercent={getWidthPercent(bar.duration, timelineTotalParts)}
              onResize={noop}
              onTaskHover={onTaskHover}
            />
          );
        })
      )}
    </>
  );
});
