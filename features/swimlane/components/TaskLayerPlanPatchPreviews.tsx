'use client';

import type { Developer, Task } from '@/types';

import { observer } from 'mobx-react-lite';
import { useCallback } from 'react';

import { getPartsPerDay } from '@/constants';
import {
  planPatchPreviewElementId,
  revealPlanPatchElement,
} from '@/features/swimlane/utils/planPatchPreviewFocus';
import { planPatchPreviewLayerKey } from '@/features/swimlane/utils/planPatchPreviewLayers';
import { computeSwimlaneRowBandBox } from '@/features/swimlane/utils/taskLayerTaskLayout';
import { TaskBar } from '@/features/task/components/TaskBar/TaskBar';
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
      if (taskId == null) {
        sprintPlannerUi.setPlanPatchFocusTaskId(null);
        return;
      }
      sprintPlannerUi.setPlanPatchFocusTaskId(taskId);
      if (document.getElementById(`task-${taskId}`)) {
        revealPlanPatchElement(`task-${taskId}`);
      }
    },
    [sprintPlannerUi]
  );
  if (timelineTotalParts <= 0) {
    return null;
  }
  const cards = [...taskPositions.planPatchPreviews.values()].filter(
    (preview) => !preview.remove && preview.assigneeId === assigneeId
  );
  if (cards.length === 0) {
    return null;
  }
  const partsPerDay = getPartsPerDay();
  return (
    <>
      {cards.map((preview) => {
        const startCell = preview.startDay * partsPerDay + preview.startPart;
        return (
          <TaskBar
            key={preview.taskId}
            developers={developers}
            disableDragAndResize
            draggableId={planPatchPreviewElementId(preview.taskId)}
            duration={preview.duration}
            globalNameFilter={globalNameFilter}
            htmlAnchorId={planPatchPreviewElementId(preview.taskId)}
            leftPercent={(startCell / timelineTotalParts) * 100}
            planPatchGhost
            requestArrowRedraw={noop}
            selectedSprintId={sprintId}
            style={computeSwimlaneRowBandBox(
              hasTaskOverlaps,
              taskLayerMap.get(planPatchPreviewLayerKey(preview.taskId)) ?? 0,
              taskBandTotalHeight,
              layerHeight
            )}
            swimlaneBarDurationParts={preview.duration}
            swimlaneTimelineTotalParts={timelineTotalParts}
            task={taskForPlanPatchPreview(tasksMap.get(preview.taskId), preview.taskId)}
            widthPercent={(preview.duration / timelineTotalParts) * 100}
            onResize={noop}
            onTaskHover={onTaskHover}
          />
        );
      })}
    </>
  );
});
