import type { Task } from '@/types';

import { useEffect } from 'react';

import { buildSyntheticQaTaskId } from '@/features/qa/utils/qaTaskUtils';

interface UseSprintPlannerSyntheticQaCleanupParams {
  selectedSprintId: number | null;
  taskPositions: Map<string, unknown>;
  tasks: Task[];
  testingFlowMode: string | undefined;
  deletePosition: (taskId: string) => Promise<void>;
}

export function useSprintPlannerSyntheticQaCleanup({
  deletePosition,
  selectedSprintId,
  taskPositions,
  tasks,
  testingFlowMode,
}: UseSprintPlannerSyntheticQaCleanupParams) {
  useEffect(() => {
    if (testingFlowMode !== 'standalone_qa_tasks' || !selectedSprintId || taskPositions.size === 0) {
      return;
    }

    const staleSyntheticQaIds = tasks
      .map((task) => buildSyntheticQaTaskId(task.id))
      .filter((qaTaskId) => taskPositions.has(qaTaskId));

    if (staleSyntheticQaIds.length === 0) {
      return;
    }

    Promise.allSettled(staleSyntheticQaIds.map((qaTaskId) => deletePosition(qaTaskId))).catch(
      () => undefined
    );
  }, [deletePosition, selectedSprintId, taskPositions, tasks, testingFlowMode]);
}
