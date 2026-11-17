/**
 * Перенос задач между спринтами агентом сразу, без черновика (docs/BUSINESS_RULES.md, K8): трекер и доски
 * Beer Tracker меняются вместе, как «Перенести в спринт» в планере (K4).
 */

import type { IssueTrackerProviderClient } from '@/lib/issueTrackerProvider/types';

import { invalidateCache } from '@/lib/cache';
import { completeIssueSprintMembershipChange } from '@/lib/issues/issueSprintMembershipRealtime';
import { getIssueTrackerProviderClientForOrganization } from '@/lib/issueTrackerProvider/clientFactory';
import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import { deleteTaskLinksForTask } from '@/lib/sprints/taskLinksRepository';
import { deleteTaskPosition, listTaskPositionSprintIds } from '@/lib/sprints/taskPositionsRepository';
import { TENANT_ORG_HEADER } from '@/lib/tenantHttpConstants';
import { isTrackerSprintIssuesFrozen } from '@/lib/trackerApi/sprintIssuesCache';

/** Куда перенести: спринт трекера или бэклог (вне спринтов). */
type IssueSprintMoveTarget = { backlog: true } | { sprintId: number };

interface IssueSprintMoveResult {
  /** Доски, с которых убраны карточка задачи и её стрелки приложения. */
  clearedSprintIds: number[];
  error?: string;
  issueKey: string;
  ok: boolean;
  /** Трекер уже держал задачу в целевом спринте и ничего не переносил; её карточка там осталась. */
  trackerUnchanged?: boolean;
}

/**
 * С каких досок убрать карточку задачи после переноса (K8): со всех незакрытых, кроме целевого спринта, —
 * и откуда задачу сняли сейчас, и брошенных прошлыми переносами в обход Beer Tracker. Закрытые спринты не
 * трогаем: их карточки — история факта. Карточку в целевом спринте сбрасываем, как перенос в планере (K4):
 * задача приходит без плана; но если трекер уже держал её там (`keepTargetCard`), её место на доске остаётся.
 */
export function sprintsToClearAfterMove(input: {
  cardSprintIds: readonly number[];
  closedSprintIds: ReadonlySet<number>;
  keepTargetCard: boolean;
  targetSprintId: number | null;
}): number[] {
  return input.cardSprintIds.filter(
    (sprintId) =>
      !input.closedSprintIds.has(sprintId) && !(sprintId === input.targetSprintId && input.keepTargetCard)
  );
}

/** Закрытые спринты среди досок с карточкой; спринт, статус которого трекер не отдал, считаем закрытым — не чистим. */
async function closedSprintIdsOf(
  issueTracker: IssueTrackerProviderClient,
  sprintIds: readonly number[]
): Promise<Set<number>> {
  const statuses = await Promise.all(
    sprintIds.map(async (sprintId) => {
      try {
        return { closed: isTrackerSprintIssuesFrozen((await issueTracker.getSprint(sprintId)).status), sprintId };
      } catch {
        return { closed: true, sprintId };
      }
    })
  );
  return new Set(statuses.filter((status) => status.closed).map((status) => status.sprintId));
}

async function moveOneIssue(input: {
  issueKey: string;
  issueTracker: IssueTrackerProviderClient;
  organizationId: string;
  target: IssueSprintMoveTarget;
}): Promise<IssueSprintMoveResult> {
  const { issueKey, issueTracker, organizationId, target } = input;
  const targetSprintId = 'sprintId' in target ? target.sprintId : null;
  // Трекер первым: не перенёс — доски не трогаем, чтобы не разойтись с ним.
  const membership =
    targetSprintId === null
      ? await issueTracker.replaceIssueSprints(issueKey, [])
      : await issueTracker.addIssueToSprint(issueKey, targetSprintId);
  const trackerUnchanged = targetSprintId !== null && membership.affectedSprintIds.length === 0;
  for (const boardId of membership.backlogBoardIds) invalidateCache.backlog(boardId);
  await completeIssueSprintMembershipChange({
    addedSprintIds: targetSprintId === null ? [] : [targetSprintId],
    issueKey,
    issueTracker,
    removedSprintIds: membership.affectedSprintIds.filter((sprintId) => sprintId !== targetSprintId),
    request: new Request('http://localhost/api/mcp', { headers: { [TENANT_ORG_HEADER]: organizationId } }),
  });

  const cardSprintIds = await listTaskPositionSprintIds({ organizationId, taskId: issueKey });
  const cleared = sprintsToClearAfterMove({
    cardSprintIds,
    closedSprintIds: await closedSprintIdsOf(issueTracker, cardSprintIds),
    keepTargetCard: trackerUnchanged,
    targetSprintId,
  });
  for (const sprintId of cleared) {
    await deleteTaskPosition({ organizationId, sprintId, taskId: issueKey });
    // Только стрелки приложения (`task_links`), как в K4; связи задач в трекере не трогаются.
    await deleteTaskLinksForTask({ organizationId, sprintId, taskId: issueKey });
    notifySprintRealtime(new Request('http://localhost/api/mcp'), organizationId, sprintId, ['positions', 'links']);
  }
  return { clearedSprintIds: cleared, issueKey, ok: true, ...(trackerUnchanged ? { trackerUnchanged } : {}) };
}

/**
 * Переносит задачи в спринт или в бэклог сразу (K8). Задачи — по очереди; ошибка одной не останавливает
 * остальные и называется в её результате.
 */
export async function moveIssuesForOrganization(input: {
  issueKeys: readonly string[];
  organizationId: string;
  target: IssueSprintMoveTarget;
}): Promise<IssueSprintMoveResult[]> {
  const issueTracker = await getIssueTrackerProviderClientForOrganization(input.organizationId);
  const results: IssueSprintMoveResult[] = [];
  for (const issueKey of [...new Set(input.issueKeys.map((key) => key.trim()).filter(Boolean))]) {
    try {
      results.push(await moveOneIssue({ issueKey, issueTracker, organizationId: input.organizationId, target: input.target }));
    } catch (error) {
      results.push({ clearedSprintIds: [], error: error instanceof Error ? error.message : String(error), issueKey, ok: false });
    }
  }
  return results;
}
