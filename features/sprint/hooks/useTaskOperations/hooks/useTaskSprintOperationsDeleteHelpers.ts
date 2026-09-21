import type { TaskLink, TaskPosition } from '@/types';

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

export async function deleteLinksAfterMove(
  linksToDelete: TaskLink[],
  deleteLink: (linkId: string) => Promise<void>
): Promise<void> {
  await Promise.all(
    linksToDelete.map((link) =>
      deleteLink(link.id).catch((error) => {
        console.error('Error deleting link:', error);
      })
    )
  );
}
