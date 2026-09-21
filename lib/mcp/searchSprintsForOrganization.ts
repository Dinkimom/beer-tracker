import type { IssueTrackerProviderClient } from '@/lib/issueTrackerProvider/types';
import type { SprintListItem } from '@/types/tracker';

import { boardAffinityScore } from '@/lib/sprints/sprintContextEnrichmentHelpers';

export interface McpSprintSearchHit {
  boardId: number;
  boardName?: string;
  endDate: string;
  name: string;
  sprintId: number;
  startDate: string;
  status: string;
}

export function matchesSprintQuery(name: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return name.toLowerCase().includes(q);
}

function sprintActiveRank(status: string): number {
  return /in_progress|active|current/i.test(status) ? 0 : 1;
}

function compareByQueryAffinity(aName: string, bName: string, queryLower: string): number {
  if (!queryLower) {
    return 0;
  }
  const a = aName.toLowerCase();
  const b = bName.toLowerCase();
  const aExact = a === queryLower ? 0 : 1;
  const bExact = b === queryLower ? 0 : 1;
  if (aExact !== bExact) {
    return aExact - bExact;
  }
  const aStarts = a.startsWith(queryLower) ? 0 : 1;
  const bStarts = b.startsWith(queryLower) ? 0 : 1;
  return aStarts - bStarts;
}

export function rankSprintSearchHits(hits: McpSprintSearchHit[], query: string): McpSprintSearchHit[] {
  const queryLower = query.trim().toLowerCase();
  return [...hits].sort((a, b) => {
    const byQuery = compareByQueryAffinity(a.name, b.name, queryLower);
    if (byQuery !== 0) {
      return byQuery;
    }
    const byBoard = boardAffinityScore(b, query) - boardAffinityScore(a, query);
    if (byBoard !== 0) {
      return byBoard;
    }
    const byActive = sprintActiveRank(a.status) - sprintActiveRank(b.status);
    if (byActive !== 0) {
      return byActive;
    }
    return b.startDate.localeCompare(a.startDate);
  });
}

/** One hit per sprintId — prefer board with dates + name affinity to query. */
export function dedupeSprintSearchHits(
  hits: McpSprintSearchHit[],
  query: string
): { collapsedDuplicates: number; hits: McpSprintSearchHit[] } {
  const groups = new Map<number, McpSprintSearchHit[]>();
  for (const hit of hits) {
    const list = groups.get(hit.sprintId) ?? [];
    list.push(hit);
    groups.set(hit.sprintId, list);
  }
  let collapsedDuplicates = 0;
  const preferred: McpSprintSearchHit[] = [];
  for (const group of groups.values()) {
    if (group.length > 1) {
      collapsedDuplicates += group.length - 1;
    }
    const best = [...group].sort(
      (a, b) => boardAffinityScore(b, query) - boardAffinityScore(a, query)
    )[0];
    if (best) {
      preferred.push(best);
    }
  }
  return { collapsedDuplicates, hits: preferred };
}

function toHit(
  sprint: SprintListItem,
  board: { id: number; name?: string }
): McpSprintSearchHit {
  const hit: McpSprintSearchHit = {
    boardId: board.id,
    endDate: sprint.endDate,
    name: sprint.name,
    sprintId: sprint.id,
    startDate: sprint.startDate,
    status: sprint.status,
  };
  if (board.name) {
    hit.boardName = board.name;
  }
  return hit;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/**
 * Search tracker sprints by name fragment (and optional board).
 * Use before get_sprint_context when the caller only remembers part of the name.
 */
export async function searchSprintsForOrganization(input: {
  boardId?: number;
  issueTracker: IssueTrackerProviderClient;
  limit?: number;
  query: string;
}): Promise<{
  hits: McpSprintSearchHit[];
  truncated: boolean;
  warnings: string[];
}> {
  const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const query = input.query.trim();
  const warnings: string[] = [];

  const boards =
    input.boardId != null
      ? [{ id: input.boardId }]
      : (await input.issueTracker.listBoards()).map((board) => ({
          id: board.id,
          name: board.name,
        }));

  const hits: McpSprintSearchHit[] = [];
  for (const board of boards) {
    let sprints: SprintListItem[] = [];
    try {
      sprints = await input.issueTracker.listSprints(board.id);
    } catch (error) {
      console.warn(`[mcp search_sprints] listSprints(${board.id}):`, error);
      continue;
    }
    for (const sprint of sprints) {
      if (!matchesSprintQuery(sprint.name, query)) {
        continue;
      }
      hits.push(toHit(sprint, board));
    }
  }

  const deduped = dedupeSprintSearchHits(hits, query);
  if (deduped.collapsedDuplicates > 0) {
    warnings.push(
      `ambiguous_boards: collapsed ${deduped.collapsedDuplicates} duplicate board row(s); preferred boards with dates / name match`
    );
  }
  const ranked = rankSprintSearchHits(deduped.hits, query);
  return {
    hits: ranked.slice(0, limit),
    truncated: ranked.length > limit,
    warnings,
  };
}
