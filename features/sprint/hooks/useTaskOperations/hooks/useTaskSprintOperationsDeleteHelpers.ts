import type { TaskLink, TaskPosition } from '@/types';

import { plannerLinkInvolvesComment } from '@/lib/planner/plannerLinkPersistence';

export async function deleteTargetSprintPosition(
  targetSprintId: number | undefined,
  actualTaskId: string
): Promise<void> {
  if (targetSprintId == null) return;
  const { deleteTaskPosition } = await import('@/lib/beerTrackerApi');
  try {
    await deleteTaskPosition(targetSprintId, actualTaskId);
  } catch (error) {
    console.error('Error deleting position in target sprint:', error);
  }
}

export async function deleteStoredPositionAfterMove(
  actualTaskId: string,
  deletePosition: (taskId: string) => Promise<void>,
  positionToRemove?: TaskPosition
): Promise<void> {
  if (!positionToRemove) return;
  try {
    await deletePosition(actualTaskId);
  } catch (error) {
    console.error('Error deleting position:', error);
  }
}

/**
 * Удаляет только связи приложения (с участием заметки — они хранятся в `task_links`).
 * Связи задача↔задача приходят из трекера и при переносе в трекере не трогаются.
 */
export async function deleteLinksAfterMove(
  linksToDelete: TaskLink[],
  deleteLink: (linkId: string) => Promise<void>
): Promise<void> {
  const plannerLinks = linksToDelete.filter((link) =>
    plannerLinkInvolvesComment(link.fromTaskId, link.toTaskId)
  );
  await Promise.all(
    plannerLinks.map((link) =>
      deleteLink(link.id).catch((error) => {
        console.error('Error deleting link:', error);
      })
    )
  );
}
