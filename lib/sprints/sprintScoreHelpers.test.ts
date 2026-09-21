import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import {
  aggregateSprintScoreFromTasks,
  buildSprintScoreRows,
  SPRINT_SCORE_MAX_MARK,
} from './sprintScoreHelpers';
import { sprintTaskCompletionRulesFromIntegration } from './sprintTaskCompletion';

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
  it('counts TP/SP done from status category overrides, not only closed/rc', () => {
    const rules = sprintTaskCompletionRulesFromIntegration({
      readyStatusKey: 'rc',
      statuses: {
        overridesByStatusKey: {
          customDone: { category: 'done' },
        },
      },
    });
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

  it('treats readyStatusKey as TP done but SP left', () => {
    const rules = sprintTaskCompletionRulesFromIntegration({
      readyStatusKey: 'rc',
    });
    const totals = aggregateSprintScoreFromTasks(
      [
        task({
          id: '1',
          originalStatus: 'rc',
          status: 'done',
          storyPoints: 4,
          testPoints: 2,
        }),
      ],
      rules
    );
    expect(totals).toEqual({
      sp_done: 0,
      sp_left: 4,
      qa_done: 2,
      qa_left: 0,
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
