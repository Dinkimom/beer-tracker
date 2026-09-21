import type { Developer, Task } from '@/types';

import { describe, expect, it } from 'vitest';

import { sprintTaskCompletionRulesFromIntegration } from '@/lib/sprints/sprintTaskCompletion';

import {
  calculateMetricsByAssignee,
  calculateMetricsByStatus,
  computeBurndownTilesFromTasks,
  isTaskDone,
} from './sprintMetrics';

function dev(partial: Partial<Developer> & Pick<Developer, 'id'>): Developer {
  return {
    name: 'N',
    role: 'developer',
    ...partial,
  };
}

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

describe('isTaskDone', () => {
  it('returns true when task.status is done', () => {
    expect(isTaskDone(task({ id: '1', status: 'done' }))).toBe(true);
  });

  it('returns false when task.status is not done', () => {
    expect(isTaskDone(task({ id: '1', status: 'todo' }))).toBe(false);
  });

  it('uses mapStatus(originalStatus) when status is absent', () => {
    expect(isTaskDone(task({ id: '1', originalStatus: 'closed' }))).toBe(true);
    expect(isTaskDone(task({ id: '2', originalStatus: 'backlog' }))).toBe(false);
  });

  it('does not treat readyStatusKey / legacy rc as SP done', () => {
    expect(isTaskDone(task({ id: '1', originalStatus: 'rc', status: 'done' }))).toBe(false);
  });
});

describe('calculateMetricsByStatus', () => {
  it('aggregates SP/TP by originalStatus and excludes goal tasks', () => {
    const rows = calculateMetricsByStatus(
      [
        task({
          id: 'a',
          originalStatus: 'inprogress',
          storyPoints: 3,
          testPoints: 0,
        }),
        task({
          id: 'b',
          originalStatus: 'inprogress',
          storyPoints: 2,
          testPoints: 1,
        }),
        task({ id: 'goal', originalStatus: 'closed', storyPoints: 10, testPoints: 0 }),
      ],
      ['goal']
    );
    const byKey = Object.fromEntries(rows.map((r) => [r.statusKey, r]));
    expect(byKey.inprogress).toEqual({ statusKey: 'inprogress', totalSP: 5, totalTP: 1 });
    expect(byKey.goal).toBeUndefined();
  });

  it('ignores QA phantom tasks for dev metrics', () => {
    const rows = calculateMetricsByStatus([
      task({
        id: 'q',
        team: 'QA',
        originalStatus: 'closed',
        storyPoints: 5,
        testPoints: 3,
      }),
    ]);
    expect(rows).toHaveLength(0);
  });
});

describe('calculateMetricsByAssignee', () => {
  it('splits SP by assignee and TP by QA involvement', () => {
    const developerMap = new Map<string, Developer>([
      ['u1', dev({ id: 'u1', name: 'Alice' })],
      ['u2', dev({ id: 'u2', name: 'Bob' })],
    ]);
    const rows = calculateMetricsByAssignee(
      [
        task({
          id: 'd1',
          assignee: 'u1',
          originalStatus: 'closed',
          status: 'done',
          storyPoints: 5,
          testPoints: 0,
        }),
        task({
          id: 'd2',
          assignee: 'u1',
          originalStatus: 'inprogress',
          status: 'in-progress',
          storyPoints: 5,
          testPoints: 0,
        }),
        task({
          id: 'qa1',
          assignee: 'u2',
          qaEngineer: 'u1',
          team: 'QA',
          originalStatus: 'intesting',
          storyPoints: 0,
          testPoints: 4,
        }),
      ],
      [],
      developerMap
    );
    const u1 = rows.find((r) => r.personId === 'u1');
    expect(u1).toMatchObject({
      personName: 'Alice',
      totalSP: 10,
      completedSP: 5,
      percentSP: 50,
      totalTP: 4,
      completedTP: 0,
      percentTP: 0,
    });
  });

  it('counts TP via done category or readyStatusKey from settings', () => {
    const developerMap = new Map<string, Developer>([
      ['qa1', dev({ id: 'qa1', name: 'Tester', role: 'tester' })],
    ]);
    const rules = sprintTaskCompletionRulesFromIntegration({
      readyStatusKey: 'rc',
      statuses: {
        overridesByStatusKey: {
          customDone: { category: 'done' },
        },
      },
    });
    const rows = calculateMetricsByAssignee(
      [
        task({
          id: 'd1',
          assignee: 'dev1',
          qaEngineer: 'qa1',
          originalStatus: 'customDone',
          storyPoints: 3,
          testPoints: 2,
        }),
        task({
          id: 'd2',
          assignee: 'dev1',
          qaEngineer: 'qa1',
          originalStatus: 'rc',
          status: 'done',
          storyPoints: 1,
          testPoints: 4,
        }),
      ],
      [],
      developerMap,
      rules
    );
    const qa = rows.find((r) => r.personId === 'qa1');
    expect(qa).toMatchObject({
      totalTP: 6,
      completedTP: 6,
      percentTP: 100,
    });
    const developer = rows.find((r) => r.personId === 'dev1');
    expect(developer).toMatchObject({
      totalSP: 4,
      completedSP: 3,
      percentSP: 75,
    });
  });
});

describe('computeBurndownTilesFromTasks', () => {
  it('совпадает с суммой по статусам и исключает цели', () => {
    const tasks = [
      task({
        id: 'a',
        originalStatus: 'inprogress',
        storyPoints: 3,
        testPoints: 1,
      }),
      task({
        id: 'b',
        originalStatus: 'closed',
        status: 'done',
        storyPoints: 2,
        testPoints: 0,
      }),
      task({ id: 'goal', originalStatus: 'closed', storyPoints: 99, testPoints: 0 }),
    ];
    const byStatus = calculateMetricsByStatus(tasks, ['goal']);
    const sumSp = byStatus.reduce((s, r) => s + r.totalSP, 0);
    const sumTp = byStatus.reduce((s, r) => s + r.totalTP, 0);
    const tiles = computeBurndownTilesFromTasks(tasks, ['goal']);
    expect(tiles.totalScopeSP).toBe(sumSp);
    expect(tiles.totalScopeTP).toBe(sumTp);
    expect(tiles.completedSP).toBe(2);
    expect(tiles.completedTP).toBe(0);
    expect(tiles.completionPercentSP).toBe(40);
  });

  it('counts completed TP for done category without literal closed', () => {
    const rules = sprintTaskCompletionRulesFromIntegration({
      statuses: {
        overridesByStatusKey: {
          resolved: { category: 'done' },
        },
      },
    });
    const tiles = computeBurndownTilesFromTasks(
      [
        task({
          id: 'a',
          originalStatus: 'resolved',
          storyPoints: 2,
          testPoints: 5,
        }),
      ],
      undefined,
      rules
    );
    expect(tiles.completedSP).toBe(2);
    expect(tiles.completedTP).toBe(5);
    expect(tiles.completionPercentTP).toBe(100);
  });
});
