import { beforeEach, describe, expect, it, vi } from 'vitest';

import { query } from '@/lib/db';

import {
  aggregateSprintGoalsByTeam,
  deleteSprintGoal,
  listSprintGoals,
  listSprintGoalTexts,
  sprintGoalExists,
  updateSprintGoal,
} from './sprintGoalsRepository';

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
}));

const ORG = '11111111-1111-4111-8111-111111111111';
const GOAL = '22222222-2222-4222-8222-222222222222';

/** Номера спринтов у трекеров пересекаются: каждый запрос к целям обязан ограничивать организацию. */
function lastCall(): { params: unknown[]; sql: string } {
  const [sql, params] = vi.mocked(query).mock.calls.at(-1)!;
  return { params: params as unknown[], sql: sql.replace(/\s+/g, ' ') };
}

describe('sprintGoalsRepository: scoped to organization', () => {
  beforeEach(() => {
    vi.mocked(query).mockReset();
    vi.mocked(query).mockResolvedValue({ rows: [] } as never);
  });

  it('lists goals of one organization', async () => {
    await listSprintGoals({ goalType: 'delivery', organizationId: ORG, sprintId: 7 });
    const { params, sql } = lastCall();
    expect(sql).toContain('WHERE organization_id = $1 AND sprint_id = $2 AND goal_type = $3');
    expect(params).toEqual([ORG, 7, 'delivery']);
  });

  it('mirrors to the tracker only goals of the organization', async () => {
    await listSprintGoalTexts({ organizationId: ORG, sprintId: 7 });
    const { params, sql } = lastCall();
    expect(sql).toContain('WHERE organization_id = $1 AND sprint_id = $2');
    expect(params).toEqual([ORG, 7]);
  });

  it('aggregates the score from goals of the organization', async () => {
    await aggregateSprintGoalsByTeam({ organizationId: ORG, sprintId: 7 });
    const { params, sql } = lastCall();
    expect(sql).toContain('WHERE organization_id = $1 AND sprint_id = $2');
    expect(params).toEqual([ORG, 7]);
  });

  it('updates a goal only inside the organization', async () => {
    await updateSprintGoal({ goalId: GOAL, organizationId: ORG, patch: { done: true, text: 'Ship' } });
    const { params, sql } = lastCall();
    expect(sql).toContain('WHERE id = $3 AND organization_id = $4');
    expect(params).toEqual(['Ship', true, GOAL, ORG]);
  });

  it('keeps the organization filter on an empty patch', async () => {
    await updateSprintGoal({ goalId: GOAL, organizationId: ORG, patch: {} });
    const { params, sql } = lastCall();
    expect(sql).toContain('WHERE id = $1 AND organization_id = $2');
    expect(params).toEqual([GOAL, ORG]);
  });

  it('deletes and checks a goal only inside the organization', async () => {
    await deleteSprintGoal({ goalId: GOAL, organizationId: ORG });
    expect(lastCall().sql).toContain('WHERE id = $1 AND organization_id = $2');
    expect(lastCall().params).toEqual([GOAL, ORG]);

    await expect(sprintGoalExists({ goalId: GOAL, organizationId: ORG })).resolves.toBe(false);
    expect(lastCall().sql).toContain('WHERE id = $1 AND organization_id = $2');
    expect(lastCall().params).toEqual([GOAL, ORG]);
  });
});
