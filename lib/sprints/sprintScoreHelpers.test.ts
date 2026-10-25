import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import {
  aggregateSprintScoreFromTasks,
  buildSprintScoreRows,
  computeSprintCompletionScope,
  SPRINT_SCORE_MAX_MARK,
} from './sprintScoreHelpers';
import { sprintTaskCompletionRulesFromStatuses } from './sprintTaskCompletion';

function task(partial: Partial<Task> & Pick<Task, 'id'>): Task {
  const { id, ...rest } = partial;
  return {
    id,
    link: 'https://t',
    name: 'Task',
    team: 'Web',
    ...rest,
  };
}

describe('aggregateSprintScoreFromTasks', () => {
  it('does not round fractional points per task (0.4 SP is not 0)', () => {
    const totals = aggregateSprintScoreFromTasks([
      task({ id: '1', originalStatus: 'closed', statusTypeKey: 'done', storyPoints: 0.4, testPoints: 0.4 }),
      task({ id: '2', originalStatus: 'closed', statusTypeKey: 'done', storyPoints: 0.4 }),
      task({ id: '3', originalStatus: 'inprogress', storyPoints: 0.4 }),
    ]);
    expect(totals.sp_done).toBeCloseTo(0.8, 6);
    expect(totals.sp_left).toBeCloseTo(0.4, 6);
    expect(totals.qa_done).toBeCloseTo(0.4, 6);
  });

  it('excludes sprint goals and QA tasks like the planner tiles', () => {
    const tasks = [
      task({ id: '1', originalStatus: 'closed', statusTypeKey: 'done', storyPoints: 3 }),
      task({ id: 'goal', originalStatus: 'inprogress', storyPoints: 8, type: 'goal' }),
      task({ hideTestPointsByIntegration: true, id: 'qa', originalStatus: 'inprogress', storyPoints: 2, team: 'QA' }),
    ];
    expect(aggregateSprintScoreFromTasks(tasks)).toEqual({ qa_done: 0, qa_left: 0, sp_done: 3, sp_left: 0 });
    expect(computeSprintCompletionScope(tasks, new Set(['goal']))).toEqual({
      completedSP: 3,
      completedTP: 0,
      totalScopeSP: 3,
      totalScopeTP: 0,
    });
  });

  it('counts SP and TP done for a custom status of type done in the tracker', () => {
    const rules = sprintTaskCompletionRulesFromStatuses('jira-cloud', [{ id: 'customDone', key: 'customDone', statusType: { key: 'done' } }]);
    const totals = aggregateSprintScoreFromTasks(
      [
        task({
          id: '1',
          originalStatus: 'customDone',
          storyPoints: 5,
          testPoints: 3,
        }),
        task({
          id: '2',
          originalStatus: 'inprogress',
          status: 'in-progress',
          storyPoints: 2,
          testPoints: 1,
        }),
      ],
      rules
    );
    expect(totals).toEqual({
      sp_done: 5,
      sp_left: 2,
      qa_done: 3,
      qa_left: 1,
    });
  });

  it('does not close SP or TP on rc: it is not a status of type done', () => {
    const totals = aggregateSprintScoreFromTasks([
      task({
        id: '1',
        originalStatus: 'rc',
        statusTypeKey: 'inProgress',
        storyPoints: 4,
        testPoints: 2,
      }),
    ]);
    expect(totals).toEqual({
      sp_done: 0,
      sp_left: 4,
      qa_done: 0,
      qa_left: 2,
    });
  });
});

describe('buildSprintScoreRows mark scale', () => {
  it('caps mark at 5 with goals 2 + SP 2 + TP 1', () => {
    const [row] = buildSprintScoreRows({
      goalsByTeam: [{ team: 'A', goals_total: 10, goals_done: 7 }],
      qaDone: 8,
      qaLeft: 2,
      sname: 'S1',
      spDone: 9,
      spLeft: 1,
      sprintId: 1,
    });
    // goals 70% → 2; SP left 10% → 2; TP left 20% → 1
    expect(row.mark_goals).toBe(2);
    expect(row.mark_sp).toBe(2);
    expect(row.mark_tp).toBe(1);
    expect(row.mark).toBe(SPRINT_SCORE_MAX_MARK);
    expect(row.mark_emoji).toBe('🟢');
  });

  it('scores TP as 0 when more than 25% left', () => {
    const [row] = buildSprintScoreRows({
      goalsByTeam: [],
      qaDone: 1,
      qaLeft: 1,
      sname: 'S1',
      spDone: 0,
      spLeft: 0,
      sprintId: 1,
    });
    // TP left 50% → 0
    expect(row.mark_tp).toBe(0);
    expect(row.mark).toBeLessThanOrEqual(SPRINT_SCORE_MAX_MARK);
  });
});
