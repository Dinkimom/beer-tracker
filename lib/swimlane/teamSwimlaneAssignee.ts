import type { Developer } from '@/types';

/** Синтетический исполнитель общей строки свимлейна (командные задачи и аннотации). */
export const TEAM_SWIMLANE_ASSIGNEE_ID = '__team__' as const;

export function isTeamSwimlaneAssigneeId(assigneeId: string | null | undefined): boolean {
  return assigneeId === TEAM_SWIMLANE_ASSIGNEE_ID;
}

export function createTeamSwimlaneDeveloper(name: string): Developer {
  return {
    id: TEAM_SWIMLANE_ASSIGNEE_ID,
    name,
    role: 'other',
  };
}

export function isTeamSwimlaneRowHidden(hiddenIds: ReadonlySet<string>): boolean {
  return hiddenIds.has(TEAM_SWIMLANE_ASSIGNEE_ID);
}

/** `__team__` в Tracker отправлять нельзя — для create берём выбранного человека или пусто. */
export function trackerAssigneeForCreatedIssue(
  positionAssignee: string,
  selectedAssignee?: string
): string | undefined {
  const selected = selectedAssignee?.trim();
  if (selected && !isTeamSwimlaneAssigneeId(selected)) {
    return selected;
  }
  if (isTeamSwimlaneAssigneeId(positionAssignee)) {
    return undefined;
  }
  return positionAssignee;
}
