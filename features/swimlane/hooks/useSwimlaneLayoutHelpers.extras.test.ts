import type { Task, TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import { sprintTaskCompletionRulesFromStatuses } from '@/lib/sprints/sprintTaskCompletion';

import {
  applyRemotePresenceCardRowPreviews,
  computeSwimlanePointTotals,
} from './useSwimlaneLayoutHelpers';

describe('computeSwimlanePointTotals (standalone QA)', () => {
  it('counts story points for standalone QA tasks and flags hideTestPoints', () => {
    const positionedTasks: Array<{ task: Task; position: TaskPosition }> = [
      {
        position: {
          assignee: 'qa-1',
          duration: 3,
          startDay: 0,
          startPart: 0,
          taskId: 'QA-1',
        },
        task: {
          hideTestPointsByIntegration: true,
          id: 'QA-1',
          link: '',
          name: 'Test task',
          storyPoints: 4,
          team: 'QA',
        },
      },
    ];

    expect(computeSwimlanePointTotals(positionedTasks)).toEqual({
      completedSP: 0,
      completedTP: 0,
      hasVolumeTasks: true,
      hideTestPoints: true,
      totalSP: 4,
      totalTP: 0,
    });
  });
});

describe('applyRemotePresenceCardRowPreviews', () => {
  it('overlays a foreign height without replacing the local busy card', () => {
    const next = applyRemotePresenceCardRowPreviews(
      new Map([['note-1', { layerShiftUp: 0, span: 1 }]]),
      new Map([
        ['note-1', { layerShiftUp: 1, span: 3 }],
        ['note-2', { layerShiftUp: 0, span: 4 }],
      ]),
      'note-1'
    );
    expect(next.get('note-1')).toEqual({ layerShiftUp: 0, span: 1 });
    expect(next.get('note-2')).toEqual({ layerShiftUp: 0, span: 4 });
  });
});

describe('computeSwimlanePointTotals (row header points)', () => {
  function placed(task: Partial<Task> & Pick<Task, 'id'>): { task: Task; position: TaskPosition } {
    return {
      position: { assignee: 'row', duration: 1, startDay: 0, startPart: 0, taskId: task.id },
      task: { link: '', name: task.id, team: 'Back', ...task },
    };
  }

  it('keeps tester TP visible when one standalone QA task shares the row with embedded TP', () => {
    const totals = computeSwimlanePointTotals([
      placed({ hideTestPointsByIntegration: true, id: 'QA-1', storyPoints: 2, team: 'QA' }),
      placed({ id: 'qa-phantom', originalTaskId: 'DEV-1', storyPoints: 0, team: 'QA', testPoints: 3 }),
    ]);
    expect(totals.totalTP).toBe(3);
    expect(totals.hideTestPoints).toBe(false);
  });

  it('hides TP only when every TP-bearing task on the row is standalone QA', () => {
    const totals = computeSwimlanePointTotals([
      placed({ hideTestPointsByIntegration: true, id: 'QA-1', storyPoints: 2, team: 'QA', testPoints: 1 }),
      placed({ id: 'DEV-2', storyPoints: 3 }),
    ]);
    expect(totals.hideTestPoints).toBe(true);
  });

  it('counts phantom TP once when its original is on the same row (not 0)', () => {
    const totals = computeSwimlanePointTotals([
      placed({ id: 'DEV-1', storyPoints: 5, testPoints: 3 }),
      placed({ id: 'qa-phantom', originalTaskId: 'DEV-1', storyPoints: 0, team: 'QA', testPoints: 3 }),
    ]);
    expect(totals.totalSP).toBe(5);
    expect(totals.totalTP).toBe(3);
  });

  it('counts phantom TP on a tester row without the original', () => {
    const totals = computeSwimlanePointTotals([
      placed({ id: 'qa-phantom', originalTaskId: 'DEV-1', storyPoints: 0, team: 'QA', testPoints: 3 }),
    ]);
    expect(totals.totalSP).toBe(0);
    expect(totals.totalTP).toBe(3);
  });

  it('closes SP and TP together only on a status of type done; rc closes nothing', () => {
    const rules = sprintTaskCompletionRulesFromStatuses('jira-cloud', [
      { id: 'rc', key: 'rc', statusType: { key: 'inProgress' } },
    ]);
    const totals = computeSwimlanePointTotals(
      [placed({ id: 'DEV-1', originalStatus: 'rc', storyPoints: 5, testPoints: 2 })],
      rules
    );
    expect(totals.completedSP).toBe(0);
    expect(totals.completedTP).toBe(0);
  });

  it('treats a custom status of type done in the tracker catalog as completed', () => {
    const rules = sprintTaskCompletionRulesFromStatuses('jira-cloud', [{ id: 'shipped', key: 'shipped', statusType: { key: 'done' } }]);
    const row = [placed({ id: 'DEV-1', originalStatus: 'shipped', storyPoints: 5, testPoints: 2 })];
    expect(computeSwimlanePointTotals(row).completedSP).toBe(0);
    expect(computeSwimlanePointTotals(row, rules)).toMatchObject({ completedSP: 5, completedTP: 2 });
  });
});
