import type { QuarterlyPlanContent } from './quarterlyPlanTypes';

import { STAFF_SWIMLANE_ASSIGNEE_PREFIX } from '@/lib/teamMemberUtils';

/**
 * Люди плана: в базе — стабильный `staff_id`, на клиенте — `Developer.id` (id в трекере или `staff:<staff_id>`).
 * Индекс строится по всем участникам команд организации.
 */
export interface QuarterlyPlanMemberIndex {
  developerIdByStaffId: ReadonlyMap<string, string>;
  staffIdByDeveloperId: ReadonlyMap<string, string>;
}

export function buildQuarterlyPlanMemberIndex(
  people: ReadonlyArray<{ developerId: string; staffId: string }>
): QuarterlyPlanMemberIndex {
  return {
    developerIdByStaffId: new Map(people.map((person) => [person.staffId, person.developerId])),
    staffIdByDeveloperId: new Map(people.map((person) => [person.developerId, person.staffId])),
  };
}

/** Для клиента. Человека уже нет в командах — он остаётся `staff:<staff_id>`: назначение не теряется (QI6). */
export function planContentForClient(
  content: QuarterlyPlanContent,
  index: QuarterlyPlanMemberIndex
): QuarterlyPlanContent {
  return {
    ...content,
    assignments: content.assignments.map((assignment) => ({
      ...assignment,
      memberId:
        index.developerIdByStaffId.get(assignment.memberId) ??
        `${STAFF_SWIMLANE_ASSIGNEE_PREFIX}${assignment.memberId}`,
    })),
  };
}

/** Для базы. `staff:<staff_id>` переводится и без индекса; незнакомый id трекера — ошибка. */
export function planContentForStorage(
  content: QuarterlyPlanContent,
  index: QuarterlyPlanMemberIndex
): { content: QuarterlyPlanContent; ok: true } | { error: string; ok: false } {
  const assignments: QuarterlyPlanContent['assignments'] = [];
  for (const assignment of content.assignments) {
    const staffId =
      index.staffIdByDeveloperId.get(assignment.memberId) ??
      (assignment.memberId.startsWith(STAFF_SWIMLANE_ASSIGNEE_PREFIX)
        ? assignment.memberId.slice(STAFF_SWIMLANE_ASSIGNEE_PREFIX.length)
        : null);
    if (!staffId) {
      return { error: `assignment ${assignment.id}: unknown member ${assignment.memberId}`, ok: false };
    }
    assignments.push({ ...assignment, memberId: staffId });
  }
  return { content: { ...content, assignments }, ok: true };
}
