import type { TaskLink } from '@/types';

import { fetchSprintLinks, saveTaskLink, saveTaskLinksBatch, deleteTaskLink } from '@/lib/beerTrackerApi';
import { SyncedList } from '@/lib/layers/application/mobx/syncedList';
import { prefetchSprintBoardList, takePrefetchedSprintBoardList } from '@/lib/sprints/sprintBoardListPrefetch';

interface TaskLinkApi {
  fromAnchor: string | null;
  fromTaskId: string;
  id: string;
  toAnchor: string | null;
  toTaskId: string;
}

export type SprintLinks = SyncedList<TaskLink, string, TaskLinkApi>;

/** Пользовательские связи задач спринта (стрелки): правки сразу, запись — после паузы. */
export function createSprintLinks(sprintId: number | null): SprintLinks {
  return new SyncedList<TaskLink, string, TaskLinkApi>(sprintId, {
    batchSaveFn: (id, items) => saveTaskLinksBatch(id, items),
    deleteFn: deleteTaskLink,
    fetchFn: fetchSprintLinks,
    getId: (link) => link.id,
    getInitialItems: (id) => takePrefetchedSprintBoardList(id, 'links'),
    loadSharedItems: (id) => prefetchSprintBoardList(id, 'links', fetchSprintLinks),
    saveFn: (id, data) => saveTaskLink(id, data),
    toApiFormat: (link) => ({
      fromAnchor: link.fromAnchor || null,
      fromTaskId: link.fromTaskId,
      id: link.id,
      toAnchor: link.toAnchor || null,
      toTaskId: link.toTaskId,
    }),
  });
}
