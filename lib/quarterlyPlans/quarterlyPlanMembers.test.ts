import type { QuarterlyPlanContent } from './quarterlyPlanTypes';

import { describe, expect, it } from 'vitest';

import {
  buildQuarterlyPlanMemberIndex,
  planContentForClient,
  planContentForStorage,
} from './quarterlyPlanMembers';

const index = buildQuarterlyPlanMemberIndex([
  { developerId: 'tracker-42', staffId: 'staff-uuid-1' },
  { developerId: 'staff:staff-uuid-2', staffId: 'staff-uuid-2' },
]);

function withMembers(...memberIds: string[]): QuarterlyPlanContent {
  return {
    assignments: memberIds.map((memberId, i) => ({ epicId: 'e1', id: `a${i}`, memberId, startWeek: 0, weeks: 1 })),
    directions: [],
    epics: [],
    links: [],
    notes: [],
  };
}

const memberIdsOf = (content: QuarterlyPlanContent) => content.assignments.map((assignment) => assignment.memberId);

describe('quarterlyPlanMembers', () => {
  it('в базе staff_id, на клиенте — id исполнителя планера', () => {
    const client = planContentForClient(withMembers('staff-uuid-1', 'staff-uuid-2'), index);
    expect(memberIdsOf(client)).toEqual(['tracker-42', 'staff:staff-uuid-2']);
    const stored = planContentForStorage(client, index);
    expect(stored.ok && memberIdsOf(stored.content)).toEqual(['staff-uuid-1', 'staff-uuid-2']);
  });

  it('человек ушёл из команд — назначение остаётся и переживает сохранение (QI6)', () => {
    const client = planContentForClient(withMembers('staff-gone'), index);
    expect(memberIdsOf(client)).toEqual(['staff:staff-gone']);
    const stored = planContentForStorage(client, index);
    expect(stored.ok && memberIdsOf(stored.content)).toEqual(['staff-gone']);
  });

  it('незнакомый id трекера не сохраняется', () => {
    expect(planContentForStorage(withMembers('tracker-999'), index)).toEqual({
      error: 'assignment a0: unknown member tracker-999',
      ok: false,
    });
  });
});
