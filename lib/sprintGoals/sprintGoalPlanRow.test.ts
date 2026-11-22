import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getIssueTrackerProviderClientForOrganization } from '@/lib/issueTrackerProvider/clientFactory';
import { fetchQuarterlyPlanContent } from '@/lib/quarterlyPlans/quarterlyPlansRepository';

import {
  buildGoalPlanRowOptions,
  goalPlanRowKey,
  parseSprintGoalPlanRow,
  planHasRow,
  planRowFromColumns,
  planRowQuarterTouchesSprint,
  toSprintGoalItem,
} from './sprintGoalPlanRow';
import { resolveSprintGoalPlanRow } from './sprintGoalRouteHelpers';

vi.mock('@/lib/quarterlyPlans/quarterlyPlansRepository', () => ({ fetchQuarterlyPlanContent: vi.fn() }));
vi.mock('@/lib/issueTrackerProvider/clientFactory', () => ({ getIssueTrackerProviderClientForOrganization: vi.fn() }));

const fetchPlan = vi.mocked(fetchQuarterlyPlanContent);

const content = {
  assignments: [],
  directions: [{ id: 'd1', teamId: 't1', title: 'Checkout' }],
  epics: [{ directionId: 'd1', id: 'e1', status: 'backlog' as const, title: 'API' }],
  links: [],
  notes: [],
};

describe('привязка цели спринта к строке плана (QG5)', () => {
  beforeEach(() => {
    fetchPlan.mockReset();
    fetchPlan.mockResolvedValue({ content, version: 3 });
  });

  it('разбирает привязку из запроса и отбрасывает лишнее и неполное', () => {
    expect(parseSprintGoalPlanRow({ quarter: 4, rowId: ' e1 ', year: 2026 })).toEqual({ quarter: 4, rowId: 'e1', year: 2026 });
    expect(parseSprintGoalPlanRow({ quarter: 5, rowId: 'e1', year: 2026 })).toBeNull();
    expect(parseSprintGoalPlanRow({ quarter: 4, year: 2026 })).toBeNull();
    expect(parseSprintGoalPlanRow({ kind: 'epic', quarter: 4, rowId: 'e1', year: 2026 })).toBeNull();
    expect(parseSprintGoalPlanRow('e1')).toBeNull();
  });

  it('строка плана — эпик или направление', () => {
    expect(planHasRow(content, 'e1')).toBe(true);
    expect(planHasRow(content, 'd1')).toBe(true);
    expect(planHasRow(content, 'gone')).toBe(false);
  });

  it('колонки цели дают привязку только втроём', () => {
    expect(planRowFromColumns({ plan_quarter: 4, plan_row_id: 'e1', plan_year: 2026 })).toEqual({ quarter: 4, rowId: 'e1', year: 2026 });
    expect(planRowFromColumns({ plan_quarter: null, plan_row_id: null, plan_year: null })).toBeNull();
  });

  it('цель в ответе API несёт строку плана', () => {
    const planRow = { quarter: 4 as const, rowId: 'e1', year: 2026 };
    expect(toSprintGoalItem({ done: true, id: 'g1', planRow, text: 'Ship' })).toEqual({
      checked: true,
      checklistItemType: 'standard',
      id: 'g1',
      planRow,
      text: 'Ship',
    });
  });

  it('поле не прислали или прислали null — в план не ходим', async () => {
    expect(await resolveSprintGoalPlanRow('org', undefined, null)).toEqual({ planRow: undefined });
    expect(await resolveSprintGoalPlanRow('org', null, null)).toEqual({ planRow: null });
    expect(fetchPlan).not.toHaveBeenCalled();
  });

  it('строка должна быть в плане своего квартала', async () => {
    const planRow = { quarter: 4, rowId: 'd1', year: 2026 };
    expect(await resolveSprintGoalPlanRow('org', planRow, null)).toEqual({ planRow });
    expect(fetchPlan).toHaveBeenCalledWith('org', planRow);
    expect(await resolveSprintGoalPlanRow('org', { ...planRow, rowId: 'gone' }, null)).toEqual({
      error: 'planRow: no epic or direction gone in the plan of 2026 Q4',
    });
    expect(await resolveSprintGoalPlanRow('org', { rowId: 'd1' }, null)).toEqual({
      error: 'planRow must be { year, quarter, rowId } or null',
    });
  });
});

describe('квартал привязки задевает спринт (QG5)', () => {
  const getSprint = vi.fn();

  beforeEach(() => {
    fetchPlan.mockReset();
    fetchPlan.mockResolvedValue({ content, version: 3 });
    getSprint.mockReset();
    vi.mocked(getIssueTrackerProviderClientForOrganization).mockResolvedValue({ getSprint } as never);
  });

  it('спринт внутри квартала или на стыке — любой из задетых кварталов', () => {
    // Квартал недели — по её четвергу (QW3): неделя 21.09 — Q3, неделя 28.09 — уже Q4.
    const window = { endDate: '2026-10-02', startDate: '2026-09-21' };
    expect(planRowQuarterTouchesSprint({ quarter: 3, year: 2026 }, window)).toBe(true);
    expect(planRowQuarterTouchesSprint({ quarter: 4, year: 2026 }, window)).toBe(true);
    expect(planRowQuarterTouchesSprint({ quarter: 1, year: 2027 }, window)).toBe(false);
  });

  it('строка квартала, который спринт не задевает, — ошибка; трекер недоступен — не проверяем', async () => {
    const planRow = { quarter: 4, rowId: 'd1', year: 2026 };
    getSprint.mockResolvedValue({ endDate: '2027-01-22', startDate: '2027-01-11' });
    expect(await resolveSprintGoalPlanRow('org', planRow, 31)).toEqual({
      error: 'planRow: 2026 Q4 does not overlap sprint 31',
    });
    getSprint.mockResolvedValue({ endDate: '2026-10-23', startDate: '2026-10-12' });
    expect(await resolveSprintGoalPlanRow('org', planRow, 31)).toEqual({ planRow });
    getSprint.mockRejectedValue(new Error('tracker down'));
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(await resolveSprintGoalPlanRow('org', planRow, 31)).toEqual({ planRow });
  });
});

describe('строки плана для выбора привязки (QG5)', () => {
  const plan = {
    directions: [
      { id: 'd1', issueKey: 'CHK-1', teamId: 't1', title: 'Checkout' },
      { id: 'd2', teamId: 't2', title: 'Platform' },
    ],
    epics: [
      { directionId: 'd1', id: 'e1', status: 'backlog' as const, title: 'API' },
      { directionId: 'd2', id: 'e2', status: 'backlog' as const, title: 'Queue' },
    ],
    quarter: 4 as const,
    teams: [
      { boardId: 10, id: 't1', members: [], sprints: [], title: 'Team 1' },
      { boardId: 20, id: 't2', members: [], sprints: [], title: 'Team 2' },
    ],
    trackerEpics: { 'CHK-1': { done: false, statusDisplay: 'In progress', title: 'Checkout redesign' } },
    year: 2026,
  };

  it('направления команды доски и эпики под ними; название — из трекера, если строка привязана', () => {
    expect(buildGoalPlanRowOptions([plan], 10)).toEqual([
      { planRow: { quarter: 4, rowId: 'd1', year: 2026 }, title: 'Checkout redesign' },
      { directionTitle: 'Checkout redesign', planRow: { quarter: 4, rowId: 'e1', year: 2026 }, title: 'API' },
    ]);
  });

  it('у доски нет команды в плане — строки всех команд', () => {
    expect(buildGoalPlanRowOptions([plan], 99).map((option) => option.planRow.rowId)).toEqual(['d1', 'e1', 'd2', 'e2']);
  });

  it('ключ привязки различает кварталы', () => {
    expect(goalPlanRowKey({ quarter: 4, rowId: 'e1', year: 2026 })).toBe('2026-Q4:e1');
    expect(goalPlanRowKey({ quarter: 1, rowId: 'e1', year: 2027 })).not.toBe('2026-Q4:e1');
  });
});
