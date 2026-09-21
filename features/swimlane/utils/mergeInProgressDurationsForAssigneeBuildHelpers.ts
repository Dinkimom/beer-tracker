import type { SwimlaneInProgressFactSegment } from './mergeInProgressDurationsForAssignee';
import type { StatusDuration } from '@/features/task/components/TaskTimeline/types';
import type { Developer, Task, TaskPosition } from '@/types';

import {
  assignLanes,
  buildRawIntervalsForTask,
  getTaskIdsOnSwimlaneRow,
  mergeIntervalsWithinTask,
  resolveFactDurationsForSwimlaneTask,
  rawToStatusDuration,
} from './mergeInProgressDurationsForAssigneeHelpers';

function collectMergedIntervalsForTask(
  taskId: string,
  swimlaneAssigneeRole: Developer['role'],
  tasksMap: Map<string, Task>,
  durationsByTaskId: Map<string, StatusDuration[]>,
  now: number
) {
  const list = resolveFactDurationsForSwimlaneTask(
    taskId,
    swimlaneAssigneeRole,
    tasksMap,
    durationsByTaskId
  );
  if (!list.length) return [];
  const task = tasksMap.get(taskId);
  const raw = buildRawIntervalsForTask(taskId, list, swimlaneAssigneeRole, task, tasksMap, now);
  return mergeIntervalsWithinTask(raw);
}

export function buildMergedFactIntervalsForAssignee(
  developerId: string,
  swimlaneAssigneeRole: Developer['role'],
  taskPositions: Map<string, TaskPosition>,
  durationsByTaskId: Map<string, StatusDuration[]>,
  tasksMap: Map<string, Task>,
  now: number = Date.now()
) {
  const taskIds = getTaskIdsOnSwimlaneRow(developerId, taskPositions);
  return taskIds.flatMap((taskId) =>
    collectMergedIntervalsForTask(
      taskId,
      swimlaneAssigneeRole,
      tasksMap,
      durationsByTaskId,
      now
    )
  );
}

export function mapMergedIntervalsToFactSegments(
  perTaskMerged: ReturnType<typeof mergeIntervalsWithinTask>,
  now: number
): SwimlaneInProgressFactSegment[] {
  const lanes = assignLanes(perTaskMerged);
  return perTaskMerged.map((interval, index) => {
    const base = rawToStatusDuration(interval, now);
    return {
      ...base,
      laneIndex: lanes[index]!,
      taskId: interval.taskId,
    } satisfies SwimlaneInProgressFactSegment;
  });
}
