/**
 * Карточка задачи на доске спринта Beer Tracker — её позиция и стрелки приложения (`task_links`).
 * Задача ушла из спринта — карточка с его доски уходит (docs/BUSINESS_RULES.md, K4 и K8): одно правило
 * для планера, бэклога, завершения спринта и агента. Связи задач в трекере не трогаются.
 */

import type { IssueTrackerProviderClient } from '@/lib/issueTrackerProvider/types';

import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import { isTrackerSprintIssuesFrozen } from '@/lib/trackerApi/sprintIssuesCache';

import { deleteTaskLinksForTask } from './taskLinksRepository';
import { deleteTaskPosition } from './taskPositionsRepository';

/** Закрытые спринты из списка; спринт, статус которого трекер не отдал, считаем закрытым — его не чистим. */
export async function closedSprintIdsOf(
  issueTracker: Pick<IssueTrackerProviderClient, 'getSprint'>,
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

/** Убрать карточку задачи с досок спринтов и сообщить открытым вкладкам. */
export async function clearIssueCards(input: {
  issueKey: string;
  organizationId: string;
  request: Request;
  sprintIds: readonly number[];
}): Promise<void> {
  const { issueKey, organizationId } = input;
  for (const sprintId of input.sprintIds) {
    await deleteTaskPosition({ organizationId, sprintId, taskId: issueKey });
    await deleteTaskLinksForTask({ organizationId, sprintId, taskId: issueKey });
    notifySprintRealtime(input.request, organizationId, sprintId, ['positions', 'links']);
  }
}
