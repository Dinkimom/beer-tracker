import type { IssueTrackerProviderClient } from '@/lib/issueTrackerProvider/types';
import type { SprintContextNeighbourSprint, SprintContextPayload } from '@/lib/sprints/sprintContextTypes';
import type { SprintListItem } from '@/types/tracker';

import { boardOwnSprints } from '@/lib/sprints/boardOwnSprints';
import { listBoardSprintsCached } from '@/lib/sprints/listBoardSprintsCached';
import { loadSprintContextForOrganization } from '@/lib/sprints/loadSprintContextForOrganization';
import { pickNeighbourSprints, summarizeNeighbourSprint } from '@/lib/sprints/sprintContextNeighbours';

export type SprintContextNeighbourInclude = 'nextSprint' | 'previousSprint';

async function loadNeighbour(input: {
  assigneeId?: string;
  mode: 'planned' | 'tail';
  organizationId: string;
  sprint: SprintListItem;
}): Promise<SprintContextNeighbourSprint> {
  const context = await loadSprintContextForOrganization({
    assigneeId: input.assigneeId,
    organizationId: input.organizationId,
    request: null,
    sprintId: input.sprint.id,
    useStoredTracker: true,
  });
  return {
    endDate: input.sprint.endDate,
    name: input.sprint.name,
    people: summarizeNeighbourSprint(context, input.mode),
    sprintId: input.sprint.id,
    startDate: input.sprint.startDate,
    status: input.sprint.status,
  };
}

/**
 * Соседние спринты той же доски, сведённые по людям: предыдущий — незакрытый входящий хвост,
 * следующий — что в нём уже стоит. Фильтр по человеку (assigneeId) действует и на соседей.
 */
export async function loadSprintContextNeighbours(input: {
  assigneeId?: string;
  include: readonly SprintContextNeighbourInclude[];
  issueTracker: Pick<IssueTrackerProviderClient, 'listSprints' | 'organizationId'>;
  organizationId: string;
  payload: SprintContextPayload;
}): Promise<{ nextSprint?: SprintContextNeighbourSprint; previousSprint?: SprintContextNeighbourSprint; warnings: string[] }> {
  const boardId = input.payload.meta.boardId;
  if (boardId == null) {
    return { warnings: ['neighbour_sprints_unavailable: board of the sprint is unknown'] };
  }
  const warnings: string[] = [];
  const sprints = boardOwnSprints(await listBoardSprintsCached(input.issueTracker, boardId), boardId);
  const neighbours = pickNeighbourSprints(sprints, input.payload.meta.sprintId);
  const wanted = [
    { key: 'previousSprint' as const, mode: 'tail' as const, sprint: neighbours.previous },
    { key: 'nextSprint' as const, mode: 'planned' as const, sprint: neighbours.next },
  ].filter((item) => input.include.includes(item.key));
  const loaded = await Promise.all(
    wanted.map(async ({ key, mode, sprint }) => {
      if (!sprint) {
        warnings.push(`${key}_missing: board ${boardId} has no ${key === 'nextSprint' ? 'next' : 'previous'} sprint`);
        return [];
      }
      try {
        return [[key, await loadNeighbour({ assigneeId: input.assigneeId, mode, organizationId: input.organizationId, sprint })] as const];
      } catch (error) {
        console.warn(`[sprint-context] neighbour ${key}(${sprint.id}):`, error);
        warnings.push(`${key}_unavailable: could not load sprint ${sprint.id}`);
        return [];
      }
    })
  );
  return { ...Object.fromEntries(loaded.flat()), warnings };
}
