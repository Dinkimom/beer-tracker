import type { Task, TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import {
  buildAssigneePlanDraft,
  stampPlanDraftTasksMap,
  taskWithPlanDraftFlag,
} from './planAssigneeDraft';

function task(overrides: Partial<Task> & Pick<Task, 'id'>): Task {
  return {
    link: '',
    name: overrides.id,
    storyPoints: 2,
    team: 'Web',
    ...overrides,
  };
}

function position(taskId: string, startDay: number, duration = 2): TaskPosition {
  return {
    assignee: 'dev-1',
    duration,
    startDay,
    startPart: 0,
    taskId,
  };
}

const developers = [
  { id: 'dev-1', name: 'Dev One' },
  { id: 'qa-1', name: 'QA One' },
];

describe('buildAssigneePlanDraft', () => {
  it('ставит незапланированные задачи выбранного исполнителя подряд', () => {
    const placed = buildAssigneePlanDraft({
      assigneeIds: new Set(['dev-1']),
      currentCell: 0,
      developers,
      existingPositions: new Map([['saved', position('saved', 0, 3)]]),
      tasks: [
        task({ assignee: 'dev-1', id: 'saved', storyPoints: 3 }),
        task({ assignee: 'dev-1', id: 'next', storyPoints: 2 }),
        task({ assignee: 'dev-2', id: 'other', storyPoints: 5 }),
        task({ assignee: 'dev-1', id: 'done', status: 'done', storyPoints: 4 }),
        task({ assignee: 'dev-1', id: 'bare', storyPoints: 0 }),
      ],
    });

    expect(placed.map((item) => item.taskId)).toEqual(['next']);
    expect(placed[0]).toMatchObject({
      assignee: 'dev-1',
      duration: 2,
      startDay: 1,
      startPart: 0,
    });
  });

  it('не трогает задачи других людей и пустой фильтр', () => {
    const tasks = [task({ assignee: 'dev-1', id: 'a' })];
    expect(
      buildAssigneePlanDraft({
        assigneeIds: new Set(),
        currentCell: 0,
        developers,
        existingPositions: new Map(),
        tasks,
      })
    ).toEqual([]);
    expect(
      buildAssigneePlanDraft({
        assigneeIds: new Set(['qa-1']),
        currentCell: 0,
        developers,
        existingPositions: new Map(),
        tasks,
      })
    ).toEqual([]);
  });

  it('планирует задачу со story points, даже если test points не заданы', () => {
    const placed = buildAssigneePlanDraft({
      assigneeIds: new Set(['dev-1']),
      currentCell: 0,
      developers,
      existingPositions: new Map(),
      tasks: [
        task({ assignee: 'dev-1', id: 'sp-only', storyPoints: 3, team: 'QA' }),
        task({
          assignee: 'dev-1',
          id: 'testing-only',
          storyPoints: 2,
          team: 'Web',
          testingOnlyByIntegrationRules: true,
        }),
      ],
    });
    expect(placed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ duration: 3, taskId: 'sp-only' }),
        expect.objectContaining({ duration: 2, taskId: 'testing-only' }),
      ])
    );
  });

  it('кладёт задачу на дорожку staff, если в фильтре id из Jira', () => {
    const placed = buildAssigneePlanDraft({
      assigneeIds: new Set(['712020:nikita']),
      currentCell: 0,
      developers: [{ id: 'staff:nikita', name: 'Nikita Dmitriev' }],
      existingPositions: new Map([
        [
          'saved',
          {
            assignee: 'staff:nikita',
            duration: 3,
            startDay: 0,
            startPart: 0,
            taskId: 'saved',
          },
        ],
      ]),
      tasks: [
        task({
          assignee: '712020:nikita',
          assigneeName: 'Nikita Dmitriev',
          id: 'open',
          storyPoints: 1,
        }),
      ],
    });
    expect(placed[0]).toMatchObject({
      assignee: 'staff:nikita',
      duration: 1,
      startDay: 1,
      startPart: 0,
    });
  });

  it('не угадывает дорожку, если имя совпало у двоих', () => {
    const placed = buildAssigneePlanDraft({
      assigneeIds: new Set(['712020:ada']),
      currentCell: 0,
      developers: [
        { id: 'staff:a', name: 'Ada' },
        { id: 'staff:b', name: 'Ada' },
      ],
      existingPositions: new Map(),
      tasks: [task({ assignee: '712020:ada', assigneeName: 'Ada', id: 'open' })],
    });
    expect(placed).toEqual([]);
  });

  it('кладёт задачи в порядке списка, а не по приоритету и размеру', () => {
    const placed = buildAssigneePlanDraft({
      assigneeIds: new Set(['dev-1']),
      currentCell: 0,
      developers,
      existingPositions: new Map(),
      tasks: [
        task({ assignee: 'dev-1', id: 'first', priority: 'low', storyPoints: 1 }),
        task({ assignee: 'dev-1', id: 'second', priority: 'blocker', storyPoints: 5 }),
      ],
    });
    expect(placed.map((item) => item.taskId)).toEqual(['first', 'second']);
    expect(placed[1]?.startPart).toBeGreaterThan(0);
  });

  it('не ставит задачу, если она вылезет за край спринта', () => {
    const placed = buildAssigneePlanDraft({
      assigneeIds: new Set(['dev-1']),
      currentCell: 0,
      developers,
      existingPositions: new Map([['saved', position('saved', 0, 2)]]),
      tasks: [
        task({ assignee: 'dev-1', id: 'fits', storyPoints: 1 }),
        task({ assignee: 'dev-1', id: 'overflow', storyPoints: 2 }),
      ],
      timelineCellCount: 3,
    });
    expect(placed.map((item) => item.taskId)).toEqual(['fits']);
    expect(placed[0]).toMatchObject({ duration: 1, startDay: 0, startPart: 2 });
  });

  it('кладёт QA-задачу по test points', () => {
    const placed = buildAssigneePlanDraft({
      assigneeIds: new Set(['qa-1']),
      currentCell: 3,
      developers,
      existingPositions: new Map(),
      tasks: [task({ assignee: 'qa-1', id: 'qa', storyPoints: 0, team: 'QA', testPoints: 2 })],
    });
    expect(placed[0]).toMatchObject({ duration: 2, startDay: 1, startPart: 0 });
  });
});

describe('stampPlanDraftTasksMap', () => {
  it('помечает в map только задачи черновика', () => {
    const saved = task({ id: 'saved' });
    const draft = task({ id: 'draft' });
    const source = new Map([
      ['saved', saved],
      ['draft', draft],
    ]);
    const stamped = stampPlanDraftTasksMap(source, new Set(['draft']));
    expect(stamped.get('draft')?.pendingApproval).toBe(true);
    expect(stamped.get('saved')).toBe(saved);
    expect(stampPlanDraftTasksMap(source, undefined)).toBe(source);
  });
});

describe('taskWithPlanDraftFlag', () => {
  it('помечает только задачи черновика', () => {
    const draft = task({ id: 'draft' });
    const saved = task({ id: 'saved' });
    const ids = new Set(['draft']);
    expect(taskWithPlanDraftFlag(draft, ids).pendingApproval).toBe(true);
    expect(taskWithPlanDraftFlag(saved, ids)).toBe(saved);
    expect(taskWithPlanDraftFlag({ ...draft, pendingApproval: true }, ids).pendingApproval).toBe(true);
  });
});
