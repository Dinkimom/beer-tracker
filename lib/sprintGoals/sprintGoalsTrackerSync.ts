import type { SprintGoalTextRow } from './sprintGoalsRepository';
import type { IssueTrackerProviderClient } from '@/lib/issueTrackerProvider/types';

import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { isJiraProviderKind } from '@/lib/issueTrackerProvider/types';

import { listSprintGoalTexts } from './sprintGoalsRepository';

const GOAL_SECTIONS = [
  { goalType: 'delivery', title: 'Delivery' },
  { goalType: 'discovery', title: 'Discovery' },
] as const;

/**
 * Текст цели спринта для трекера: по строке на цель. Заголовки Delivery/Discovery —
 * только когда есть цели обоих видов. Нет целей — пустая строка (цель в трекере очищается).
 */
export function formatSprintGoalsForTracker(rows: readonly SprintGoalTextRow[]): string {
  const sections = GOAL_SECTIONS.map(({ goalType, title }) => ({
    lines: rows
      .filter((row) => row.goal_type === goalType)
      .map((row) => row.text.trim())
      .filter(Boolean)
      .map((text) => `- ${text}`),
    title,
  })).filter((section) => section.lines.length > 0);
  if (sections.length === 1) {
    return sections[0]!.lines.join('\n');
  }
  return sections.map((section) => [`${section.title}:`, ...section.lines].join('\n')).join('\n\n');
}

/**
 * Односторонний синк BT → Jira: цели спринта перезаписывают поле goal спринта в Jira.
 * Вызывать после записи в sprint_goals. Ошибки трекера не пробрасываются — цель в BT уже сохранена.
 */
export async function syncSprintGoalsToTracker(input: {
  getIssueTracker: () => Promise<IssueTrackerProviderClient>;
  sprintId: number;
}): Promise<void> {
  try {
    const issueTracker = await input.getIssueTracker();
    if (!isJiraProviderKind(issueTracker.providerKind)) {
      return;
    }
    const rows = await listSprintGoalTexts({ sprintId: input.sprintId });
    await issueTracker.updateSprintGoal(input.sprintId, formatSprintGoalsForTracker(rows));
  } catch (error) {
    console.error(`Failed to sync sprint ${input.sprintId} goals to tracker:`, error);
  }
}

/** Синк из HTTP-роута: в трекер идём с токеном из запроса. */
export function syncSprintGoalsToTrackerFromRequest(request: Request, sprintId: number): Promise<void> {
  return syncSprintGoalsToTracker({
    getIssueTracker: () => getIssueTrackerProviderClientFromRequest(request),
    sprintId,
  });
}
