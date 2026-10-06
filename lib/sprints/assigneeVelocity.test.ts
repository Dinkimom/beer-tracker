import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import { sprintTaskCompletionRulesFromIntegration } from '@/lib/sprints/sprintTaskCompletion';

import {
  averageAssigneeVelocity,
  deliveryFromTasks,
  selectRecentFinishedSprints,
  type VelocitySprintCandidate,
} from './assigneeVelocity';

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

function sprint(
  partial: Partial<VelocitySprintCandidate> & Pick<VelocitySprintCandidate, 'id'>
): VelocitySprintCandidate {
  return {
    archived: false,
    endDate: '2026-01-01',
    status: 'archived',
    ...partial,
  };
}

describe('selectRecentFinishedSprints', () => {
  const board = [
    sprint({ id: 1, endDate: '2026-01-10' }),
    sprint({ id: 2, endDate: '2026-01-24' }),
    sprint({ id: 3, endDate: '2026-02-07' }),
    sprint({ id: 4, endDate: '2026-02-21', status: 'in_progress', archived: false }),
    sprint({ id: 5, endDate: '2026-03-07', status: 'draft', archived: false }),
  ];

  it('takes the three finished sprints that ended before the open one', () => {
    expect(selectRecentFinishedSprints(board, 4).map((item) => item.id)).toEqual([3, 2, 1]);
  });

  it('skips the sprint being viewed and anything that ended with it or later', () => {
    expect(selectRecentFinishedSprints(board, 3).map((item) => item.id)).toEqual([2, 1]);
  });

  it('treats archived flag as finished even when status is still in progress', () => {
    const closedEarly = sprint({
      id: 9,
      endDate: '2026-02-01',
      status: 'in_progress',
      archived: true,
    });
    expect(selectRecentFinishedSprints([closedEarly, board[3]], 4).map((item) => item.id)).toEqual([
      9,
    ]);
  });
});

describe('deliveryFromTasks', () => {
  const rules = sprintTaskCompletionRulesFromIntegration({
    readyStatusKey: 'rc',
    statuses: {
      overridesByStatusKey: {
        customDone: { category: 'done' },
      },
    },
  });

  it('counts closed story points on the assignee and test points on QA', () => {
    const delivery = deliveryFromTasks(
      [
        task({
          id: 'd1',
          assignee: 'dev',
          qaEngineer: 'qa',
          originalStatus: 'customDone',
          storyPoints: 5,
          testPoints: 2,
        }),
        task({
          id: 'd2',
          assignee: 'dev',
          originalStatus: 'inprogress',
          status: 'in-progress',
          storyPoints: 3,
          testPoints: 1,
        }),
        task({
          id: 'qa1',
          assignee: 'qa',
          team: 'QA',
          originalStatus: 'rc',
          status: 'done',
          storyPoints: 8,
          testPoints: 4,
        }),
      ],
      rules
    );

    expect(delivery.get('dev')).toMatchObject({
      completedSp: 5,
      hadSp: true,
      hadTp: false,
    });
    expect(delivery.get('qa')).toMatchObject({
      completedTp: 6,
      hadTp: true,
      hadSp: false,
    });
  });

  it('does not count a QA phantom twice when assignee and qaEngineer are the same person', () => {
    const delivery = deliveryFromTasks([
      task({
        id: 'qa1',
        assignee: 'qa',
        qaEngineer: 'qa',
        team: 'QA',
        status: 'done',
        testPoints: 4,
      }),
    ]);
    expect(delivery.get('qa')?.completedTp).toBe(4);
  });
});

describe('averageAssigneeVelocity', () => {
  it('skips a sprint where the person had no tasks', () => {
    const first = deliveryFromTasks([
      task({ id: 'a', assignee: 'dev', status: 'done', storyPoints: 8 }),
    ]);
    const second = deliveryFromTasks([
      task({ id: 'b', assignee: 'other', status: 'done', storyPoints: 9 }),
    ]);
    const third = deliveryFromTasks([
      task({ id: 'c', assignee: 'dev', status: 'done', storyPoints: 4 }),
    ]);

    expect(averageAssigneeVelocity([first, second, third])).toEqual({
      sprintCount: 3,
      byAssignee: {
        dev: { averageSp: 6, averageTp: null, spSprintCount: 2, tpSprintCount: 0 },
        other: { averageSp: 9, averageTp: null, spSprintCount: 1, tpSprintCount: 0 },
      },
      byName: {},
    });
  });

  it('keeps a zero when the person had tasks but closed nothing', () => {
    const first = deliveryFromTasks([
      task({ id: 'a', assignee: 'dev', status: 'done', storyPoints: 8 }),
    ]);
    const second = deliveryFromTasks([
      task({ id: 'b', assignee: 'dev', status: 'in-progress', storyPoints: 5 }),
    ]);
    const third = deliveryFromTasks([
      task({ id: 'c', assignee: 'dev', status: 'done', storyPoints: 4 }),
    ]);

    expect(averageAssigneeVelocity([first, second, third]).byAssignee.dev).toEqual({
      averageSp: 4,
      averageTp: null,
      spSprintCount: 3,
      tpSprintCount: 0,
    });
  });

  it('indexes a unique display name and drops a shared one', () => {
    const delivery = deliveryFromTasks([
      task({
        id: 'a',
        assignee: 'dev',
        assigneeName: 'Nikita Dmitriev',
        status: 'done',
        storyPoints: 6,
      }),
      task({
        id: 'b',
        assignee: 'other',
        assigneeName: 'Nikita Dmitriev',
        status: 'done',
        storyPoints: 1,
      }),
      task({
        id: 'c',
        assignee: 'qa',
        assigneeName: 'Altynbek Kazezov',
        status: 'done',
        storyPoints: 3,
      }),
    ]);

    expect(averageAssigneeVelocity([delivery]).byName).toEqual({
      'altynbek kazezov': {
        averageSp: 3,
        averageTp: null,
        spSprintCount: 1,
        tpSprintCount: 0,
      },
    });
  });

  it('returns an empty window when every sprint failed to load', () => {
    expect(averageAssigneeVelocity([])).toEqual({
      byAssignee: {},
      byName: {},
      sprintCount: 0,
    });
  });
});
