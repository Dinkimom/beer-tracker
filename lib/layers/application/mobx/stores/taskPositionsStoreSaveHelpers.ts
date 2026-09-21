import type { TaskPosition } from '@/types';

import {
  saveTaskPosition,
  saveTaskPositionsBatch,
} from '@/lib/beerTrackerApi';
import { taskPositionToApi } from '@/lib/layers/data/mappers/taskPositionToApi';
import { isEphemeralPlannerPositionId } from '@/lib/planner/ephemeralPlannerPositionId';

interface PendingPositionUpdate {
  devTaskKey?: string;
  isQa: boolean;
  position: TaskPosition;
}

function toApiPayload(
  update: PendingPositionUpdate,
  syncAssignees: boolean
): ReturnType<typeof taskPositionToApi> & { syncAssignee: boolean } {
  return {
    ...taskPositionToApi(update.position, update.isQa, update.devTaskKey),
    syncAssignee: syncAssignees,
  };
}

export function filterPersistablePositionUpdates(
  updates: Map<string, PendingPositionUpdate>
): Map<string, PendingPositionUpdate> {
  const persistable = new Map<string, PendingPositionUpdate>();
  for (const [taskId, update] of updates) {
    if (
      isEphemeralPlannerPositionId(taskId) ||
      isEphemeralPlannerPositionId(update.position.taskId)
    ) {
      continue;
    }
    persistable.set(taskId, update);
  }
  return persistable;
}

export async function flushPendingPositionUpdates(
  sprintId: number,
  updates: Map<string, PendingPositionUpdate>,
  syncAssignees: boolean,
  pendingUpdatesRef: Map<string, PendingPositionUpdate>
): Promise<void> {
  const persistable = filterPersistablePositionUpdates(updates);
  if (persistable.size > 1) {
    try {
      const positionsArray = Array.from(persistable.values()).map((update) =>
        toApiPayload(update, syncAssignees)
      );
      await saveTaskPositionsBatch(sprintId, positionsArray);
    } catch (error) {
      console.error('Error saving batch positions:', error);
      persistable.forEach((update, taskId) => {
        pendingUpdatesRef.set(taskId, update);
      });
      throw error;
    }
    return;
  }

  if (persistable.size !== 1) {
    return;
  }

  const [update] = Array.from(persistable.values());
  try {
    await saveTaskPosition(sprintId, toApiPayload(update, syncAssignees));
  } catch (error) {
    console.error('Error saving position:', error);
    pendingUpdatesRef.set(update.position.taskId, update);
    throw error;
  }
}

export async function flushPendingPositionUpdatesQuietly(
  sprintId: number,
  updates: Map<string, PendingPositionUpdate>,
  syncAssignees: boolean,
  pendingUpdatesRef: Map<string, PendingPositionUpdate>
): Promise<void> {
  try {
    await flushPendingPositionUpdates(sprintId, updates, syncAssignees, pendingUpdatesRef);
  } catch {
    /* caller already restored pending updates */
  }
}
