export interface BacklogLocatedTask {
  sourceSprintId: number | null;
  taskId: string;
}

export function locateBacklogSelections(
  selectedIds: Iterable<string>,
  backlogTasks: readonly { id: string }[],
  sprintTasks: ReadonlyMap<number, readonly { id: string }[]>
): { locations: BacklogLocatedTask[]; missingIds: string[] } {
  const backlogIds = new Set(backlogTasks.map((task) => task.id));
  const sprintOf = new Map<string, number>();
  for (const [sprintId, tasks] of sprintTasks) {
    for (const task of tasks) {
      if (!sprintOf.has(task.id)) sprintOf.set(task.id, sprintId);
    }
  }

  const locations: BacklogLocatedTask[] = [];
  const missingIds: string[] = [];
  for (const taskId of selectedIds) {
    const sprintId = sprintOf.get(taskId);
    if (sprintId != null) {
      locations.push({ sourceSprintId: sprintId, taskId });
      continue;
    }
    if (backlogIds.has(taskId)) {
      locations.push({ sourceSprintId: null, taskId });
      continue;
    }
    missingIds.push(taskId);
  }
  return { locations, missingIds };
}

export function backlogTasksForSprintMove(
  locations: readonly BacklogLocatedTask[],
  targetSprintId: number
): BacklogLocatedTask[] {
  return locations.filter((item) => item.sourceSprintId !== targetSprintId);
}

export function backlogTasksForBacklogMove(locations: readonly BacklogLocatedTask[]): BacklogLocatedTask[] {
  return locations.filter((item) => item.sourceSprintId !== null);
}

export function planBacklogBulkDestination(
  destination: 'backlog' | 'sprint',
  locations: readonly BacklogLocatedTask[],
  targetSprintId: number | undefined
): { items: BacklogLocatedTask[]; skippedIds: string[] } | null {
  if (destination === 'sprint') {
    if (targetSprintId == null) return null;
    return splitBacklogMove(locations, backlogTasksForSprintMove(locations, targetSprintId));
  }
  return splitBacklogMove(locations, backlogTasksForBacklogMove(locations));
}

function splitBacklogMove(
  locations: readonly BacklogLocatedTask[],
  items: readonly BacklogLocatedTask[]
): { items: BacklogLocatedTask[]; skippedIds: string[] } {
  const movingIds = new Set(items.map((item) => item.taskId));
  return {
    items: [...items],
    skippedIds: locations.filter((item) => !movingIds.has(item.taskId)).map((item) => item.taskId),
  };
}

export function backlogBulkMoveFeedback(input: {
  destination: 'backlog' | 'sprint';
  failed: number;
  moved: number;
}): { key: string; params?: Record<string, number> } {
  if (input.moved === 0 && input.failed === 0) {
    return { key: 'backlog.bulk.nothingToMove' };
  }
  if (input.moved === 0) {
    return { key: 'backlog.bulk.moveFailed' };
  }
  if (input.failed === 0) {
    const key = input.destination === 'sprint' ? 'backlog.bulk.movedToSprint' : 'backlog.bulk.movedToBacklog';
    return { key, params: { count: input.moved } };
  }
  return { key: 'backlog.bulk.movePartial', params: { failed: input.failed, ok: input.moved } };
}

export async function runBacklogBulkMoves<T extends { taskId: string }>(
  items: readonly T[],
  move: (item: T) => Promise<void>
): Promise<{ failed: number; movedIds: string[] }> {
  const movedIds: string[] = [];
  let failed = 0;
  for (const item of items) {
    try {
      await move(item);
      movedIds.push(item.taskId);
    } catch {
      failed += 1;
    }
  }
  return { failed, movedIds };
}
