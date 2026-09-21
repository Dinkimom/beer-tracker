import type { Task, TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import {
  buildAssigneeUnavailableDays,
  formatOccupancyErrorTooltip,
  getOccupancyErrorDays,
  getOccupancyErrorDetailsByDay,
  getOccupancyErrorReasons,
  getOccupancyErrorTaskIds,
  getOverlappingTaskIds,
  OCCUPANCY_ERROR_MESSAGES,
} from './occupancyValidation';

function devTask(id: string, name = id, originalStatus?: string): Task {
  return { id, link: '', name, team: 'Web', ...(originalStatus != null ? { originalStatus } : {}) };
}

function qaTask(id: string, originalTaskId: string, name = id): Task {
  return { id, link: '', name, team: 'QA', originalTaskId };
}

function photoTask(id: string): Task {
  return { id, link: '', localDraftKind: 'image', name: 'photo', team: 'Web' };
}

function position(
  overrides: Partial<TaskPosition> & Pick<TaskPosition, 'assignee' | 'taskId'>
): TaskPosition {
  return {
    duration: 1,
    startDay: 0,
    startPart: 0,
    ...overrides,
  };
}

describe('buildAssigneeUnavailableDays', () => {
  it('returns empty map for null or undefined availability', () => {
    expect(buildAssigneeUnavailableDays(null, new Date(2025, 0, 6)).size).toBe(0);
    expect(buildAssigneeUnavailableDays(undefined, new Date(2025, 0, 6)).size).toBe(0);
  });

  it('returns empty map when vacations and techSprints are empty', () => {
    expect(
      buildAssigneeUnavailableDays(
        { planId: 'p-empty', vacations: [], techSprints: [] },
        new Date(2025, 0, 6)
      ).size
    ).toBe(0);
  });

  it('marks days from boardEvents sick_leave', () => {
    const sprintStart = new Date(2025, 0, 6);
    const map = buildAssigneeUnavailableDays(
      {
        boardEvents: [
          {
            id: 's1',
            memberId: 'bob',
            memberName: 'Bob',
            startDate: '2000-01-01',
            endDate: '2100-12-31',
            eventType: 'sick_leave',
          },
        ],
        planId: 'board-1',
        vacations: [],
        techSprints: [],
      },
      sprintStart
    );
    const days = map.get('bob');
    expect(days).toBeDefined();
    expect(days!.size).toBeGreaterThan(0);
  });

  it('marks working-day indices when vacation range covers sprint calendar', () => {
    const sprintStart = new Date(2025, 0, 6);
    const map = buildAssigneeUnavailableDays(
      {
        planId: 'p-v1',
        vacations: [
          {
            id: 'v1',
            memberId: 'alice',
            memberName: 'Alice',
            startDate: '2000-01-01',
            endDate: '2100-12-31',
          },
        ],
        techSprints: [],
      },
      sprintStart
    );
    const days = map.get('alice');
    expect(days).toBeDefined();
    expect(days!.size).toBeGreaterThan(0);
    expect(days!.size).toBeLessThanOrEqual(10);
  });
});

describe('getOccupancyErrorDays', () => {
  it('returns empty set when there are no tasks', () => {
    expect(getOccupancyErrorDays([], new Map())).toEqual(new Set());
  });

  it('flags days when QA phase starts before dev phase ends', () => {
    const dev = devTask('dev-1');
    const qa = qaTask('qa-1', 'dev-1');
    const tasks = [dev, qa];
    const positions = new Map<string, TaskPosition>([
      ['dev-1', position({ taskId: 'dev-1', assignee: 'd1', startDay: 0, startPart: 0, duration: 3 })],
      ['qa-1', position({ taskId: 'qa-1', assignee: 'q1', startDay: 0, startPart: 0, duration: 1 })],
    ]);
    const days = getOccupancyErrorDays(tasks, positions);
    expect(days.has(0)).toBe(true);
  });

  it('does not flag when QA starts at or after dev end', () => {
    const dev = devTask('dev-1');
    const qa = qaTask('qa-1', 'dev-1');
    const tasks = [dev, qa];
    const positions = new Map<string, TaskPosition>([
      ['dev-1', position({ taskId: 'dev-1', assignee: 'd1', startDay: 0, startPart: 0, duration: 3 })],
      [
        'qa-1',
        position({ taskId: 'qa-1', assignee: 'q1', startDay: 1, startPart: 0, duration: 1 }),
      ],
    ]);
    expect(getOccupancyErrorDays(tasks, positions).size).toBe(0);
  });

  it('flags days when same assignee has overlapping segments on different tasks', () => {
    const t1 = devTask('t1');
    const t2 = devTask('t2');
    const positions = new Map<string, TaskPosition>([
      ['t1', position({ taskId: 't1', assignee: 'same', startDay: 0, startPart: 0, duration: 2 })],
      ['t2', position({ taskId: 't2', assignee: 'same', startDay: 0, startPart: 1, duration: 2 })],
    ]);
    const days = getOccupancyErrorDays([t1, t2], positions);
    expect(days.has(0)).toBe(true);
  });

  it('does not flag performer overlap when both tasks are closed', () => {
    const t1 = devTask('t1', 't1', 'closed');
    const t2 = devTask('t2', 't2', 'closed');
    const positions = new Map<string, TaskPosition>([
      ['t1', position({ taskId: 't1', assignee: 'same', startDay: 0, startPart: 0, duration: 2 })],
      ['t2', position({ taskId: 't2', assignee: 'same', startDay: 0, startPart: 1, duration: 2 })],
    ]);
    expect(getOccupancyErrorDays([t1, t2], positions).size).toBe(0);
  });

  it('does not flag performer overlap when only one of two tasks is closed', () => {
    const t1 = devTask('t1', 't1', 'closed');
    const t2 = devTask('t2');
    const positions = new Map<string, TaskPosition>([
      ['t1', position({ taskId: 't1', assignee: 'same', startDay: 0, startPart: 0, duration: 2 })],
      ['t2', position({ taskId: 't2', assignee: 'same', startDay: 0, startPart: 1, duration: 2 })],
    ]);
    expect(getOccupancyErrorDays([t1, t2], positions).size).toBe(0);
  });

  it('does not flag performer overlap when one task is rc (готово по ключу Трекера)', () => {
    const t1 = devTask('t1', 't1', 'rc');
    const t2 = devTask('t2');
    const positions = new Map<string, TaskPosition>([
      ['t1', position({ taskId: 't1', assignee: 'same', startDay: 0, startPart: 0, duration: 2 })],
      ['t2', position({ taskId: 't2', assignee: 'same', startDay: 0, startPart: 1, duration: 2 })],
    ]);
    expect(getOccupancyErrorDays([t1, t2], positions).size).toBe(0);
  });

  it('ignores positions for tasks not in the tasks list', () => {
    const t1 = devTask('t1');
    const positions = new Map<string, TaskPosition>([
      ['t1', position({ taskId: 't1', assignee: 'a', startDay: 0, startPart: 0, duration: 1 })],
      ['ghost', position({ taskId: 'ghost', assignee: 'a', startDay: 0, startPart: 0, duration: 9 })],
    ]);
    expect(getOccupancyErrorDays([t1], positions).size).toBe(0);
  });

  it('flags days when assignee is unavailable on occupied day', () => {
    const t1 = devTask('t1');
    const positions = new Map<string, TaskPosition>([
      ['t1', position({ taskId: 't1', assignee: 'bob', startDay: 0, startPart: 0, duration: 1 })],
    ]);
    const unavailable = new Map([['bob', new Set([0])]]);
    const days = getOccupancyErrorDays([t1], positions, unavailable);
    expect(days.has(0)).toBe(true);
  });
});

describe('getOccupancyErrorTaskIds', () => {
  it('includes dev and qa when qa_before_dev', () => {
    const dev = devTask('dev-1');
    const qa = qaTask('qa-1', 'dev-1');
    const positions = new Map<string, TaskPosition>([
      ['dev-1', position({ taskId: 'dev-1', assignee: 'd1', startDay: 0, startPart: 0, duration: 2 })],
      ['qa-1', position({ taskId: 'qa-1', assignee: 'q1', startDay: 0, startPart: 0, duration: 1 })],
    ]);
    const ids = getOccupancyErrorTaskIds([dev, qa], positions);
    expect(ids.has('dev-1')).toBe(true);
    expect(ids.has('qa-1')).toBe(true);
  });

  it('includes both tasks on performer overlap', () => {
    const t1 = devTask('t1');
    const t2 = devTask('t2');
    const positions = new Map<string, TaskPosition>([
      ['t1', position({ taskId: 't1', assignee: 'x', startDay: 0, startPart: 0, duration: 2 })],
      ['t2', position({ taskId: 't2', assignee: 'x', startDay: 0, startPart: 1, duration: 2 })],
    ]);
    const ids = getOccupancyErrorTaskIds([t1, t2], positions);
    expect(ids.has('t1')).toBe(true);
    expect(ids.has('t2')).toBe(true);
  });

  it('does not flag either task on performer overlap when one is closed', () => {
    const t1 = devTask('t1', 't1', 'closed');
    const t2 = devTask('t2');
    const positions = new Map<string, TaskPosition>([
      ['t1', position({ taskId: 't1', assignee: 'x', startDay: 0, startPart: 0, duration: 2 })],
      ['t2', position({ taskId: 't2', assignee: 'x', startDay: 0, startPart: 1, duration: 2 })],
    ]);
    const ids = getOccupancyErrorTaskIds([t1, t2], positions);
    expect(ids.has('t1')).toBe(false);
    expect(ids.has('t2')).toBe(false);
  });

  it('does not flag a photo card overlapping a real task', () => {
    const photo = photoTask('local-image:1');
    const task = devTask('t1');
    const positions = new Map<string, TaskPosition>([
      ['local-image:1', position({ taskId: 'local-image:1', assignee: 'x', startDay: 0, startPart: 0, duration: 2 })],
      ['t1', position({ taskId: 't1', assignee: 'x', startDay: 0, startPart: 1, duration: 2 })],
    ]);
    const ids = getOccupancyErrorTaskIds([photo, task], positions);
    expect(ids.has('local-image:1')).toBe(false);
    expect(ids.has('t1')).toBe(false);
  });

  it('does not flag a saved photo comment overlapping a real task', () => {
    const photo = photoTask('comment:c1');
    const task = devTask('t1');
    const positions = new Map<string, TaskPosition>([
      ['comment:c1', position({ taskId: 'comment:c1', assignee: 'x', startDay: 0, startPart: 0, duration: 2 })],
      ['t1', position({ taskId: 't1', assignee: 'x', startDay: 0, startPart: 0, duration: 2 })],
    ]);
    const ids = getOccupancyErrorTaskIds([photo, task], positions);
    expect(ids.has('comment:c1')).toBe(false);
    expect(ids.has('t1')).toBe(false);
  });

  it('still flags overlapping real tasks when a photo sits on the same cells', () => {
    const photo = photoTask('local-image:1');
    const t1 = devTask('t1');
    const t2 = devTask('t2');
    const positions = new Map<string, TaskPosition>([
      ['local-image:1', position({ taskId: 'local-image:1', assignee: 'x', startDay: 0, startPart: 0, duration: 2 })],
      ['t1', position({ taskId: 't1', assignee: 'x', startDay: 0, startPart: 0, duration: 2 })],
      ['t2', position({ taskId: 't2', assignee: 'x', startDay: 0, startPart: 1, duration: 2 })],
    ]);
    const ids = getOccupancyErrorTaskIds([photo, t1, t2], positions);
    expect(ids.has('local-image:1')).toBe(false);
    expect(ids.has('t1')).toBe(true);
    expect(ids.has('t2')).toBe(true);
  });
});

describe('getOverlappingTaskIds', () => {
  it('returns empty set when task has no position', () => {
    expect(getOverlappingTaskIds('missing', [devTask('t1')], new Map())).toEqual(new Set());
  });

  it('returns other task id on same assignee overlap', () => {
    const t1 = devTask('t1');
    const t2 = devTask('t2');
    const positions = new Map<string, TaskPosition>([
      ['t1', position({ taskId: 't1', assignee: 'x', startDay: 0, startPart: 0, duration: 2 })],
      ['t2', position({ taskId: 't2', assignee: 'x', startDay: 0, startPart: 1, duration: 2 })],
    ]);
    expect(getOverlappingTaskIds('t1', [t1, t2], positions)).toEqual(new Set(['t2']));
  });

  it('links QA task to dev when segments overlap', () => {
    const dev = devTask('dev-1');
    const qa = qaTask('qa-1', 'dev-1');
    const positions = new Map<string, TaskPosition>([
      ['dev-1', position({ taskId: 'dev-1', assignee: 'd', startDay: 0, startPart: 0, duration: 3 })],
      ['qa-1', position({ taskId: 'qa-1', assignee: 'q', startDay: 0, startPart: 0, duration: 2 })],
    ]);
    expect(getOverlappingTaskIds('qa-1', [dev, qa], positions)).toEqual(new Set(['dev-1']));
  });
});

describe('getOccupancyErrorReasons', () => {
  it('records qa_without_dev only on QA task', () => {
    const qa = qaTask('qa-1', 'dev-missing');
    const positions = new Map<string, TaskPosition>([
      ['qa-1', position({ taskId: 'qa-1', assignee: 'q', startDay: 0, startPart: 0, duration: 1 })],
    ]);
    const reasons = getOccupancyErrorReasons([qa], positions);
    expect(reasons.get('qa-1')).toEqual(['qa_without_dev']);
  });

  it('records qa_before_dev on both dev and qa', () => {
    const dev = devTask('dev-1');
    const qa = qaTask('qa-1', 'dev-1');
    const positions = new Map<string, TaskPosition>([
      ['dev-1', position({ taskId: 'dev-1', assignee: 'd', startDay: 0, startPart: 0, duration: 2 })],
      ['qa-1', position({ taskId: 'qa-1', assignee: 'q', startDay: 0, startPart: 0, duration: 1 })],
    ]);
    const reasons = getOccupancyErrorReasons([dev, qa], positions);
    expect(reasons.get('dev-1')).toContain('qa_before_dev');
    expect(reasons.get('qa-1')).toContain('qa_before_dev');
  });

  it('dedupes repeated performer_overlap for same task', () => {
    const t1 = devTask('t1');
    const t2 = devTask('t2');
    const t3 = devTask('t3');
    const positions = new Map<string, TaskPosition>([
      ['t1', position({ taskId: 't1', assignee: 'x', startDay: 0, startPart: 0, duration: 3 })],
      ['t2', position({ taskId: 't2', assignee: 'x', startDay: 0, startPart: 1, duration: 3 })],
      ['t3', position({ taskId: 't3', assignee: 'x', startDay: 0, startPart: 2, duration: 3 })],
    ]);
    const reasons = getOccupancyErrorReasons([t1, t2, t3], positions);
    expect(reasons.get('t1')?.filter((r) => r === 'performer_overlap').length).toBe(1);
  });

  it('adds assignee_unavailable from map', () => {
    const t1 = devTask('t1');
    const positions = new Map<string, TaskPosition>([
      ['t1', position({ taskId: 't1', assignee: 'bob', startDay: 1, startPart: 0, duration: 1 })],
    ]);
    const unavailable = new Map([['bob', new Set([1])]]);
    const reasons = getOccupancyErrorReasons([t1], positions, unavailable);
    expect(reasons.get('t1')).toContain('assignee_unavailable');
  });
});

describe('formatOccupancyErrorTooltip', () => {
  it('returns empty string for undefined or empty', () => {
    expect(formatOccupancyErrorTooltip(undefined)).toBe('');
    expect(formatOccupancyErrorTooltip([])).toBe('');
  });

  it('joins known messages with bullet', () => {
    const text = formatOccupancyErrorTooltip(['qa_before_dev', 'performer_overlap']);
    expect(text).toContain(OCCUPANCY_ERROR_MESSAGES.qa_before_dev);
    expect(text).toContain(OCCUPANCY_ERROR_MESSAGES.performer_overlap);
    expect(text).toContain('•');
  });
});

describe('getOccupancyErrorDetailsByDay', () => {
  it('aggregates task names and human-readable reasons per day', () => {
    const t1 = devTask('t1', 'Task One');
    const t2 = devTask('t2', 'Task Two');
    const positions = new Map<string, TaskPosition>([
      ['t1', position({ taskId: 't1', assignee: 'x', startDay: 0, startPart: 0, duration: 2 })],
      ['t2', position({ taskId: 't2', assignee: 'x', startDay: 0, startPart: 1, duration: 2 })],
    ]);
    const byDay = getOccupancyErrorDetailsByDay([t1, t2], positions);
    const day0 = byDay.get(0);
    expect(day0).toBeDefined();
    const names = day0!.map((d) => d.taskName).sort();
    expect(names).toEqual(['Task One', 'Task Two']);
    expect(day0!.every((d) => d.reasons.includes(OCCUPANCY_ERROR_MESSAGES.performer_overlap))).toBe(
      true
    );
  });

  it('includes qa_without_dev on each affected day', () => {
    const qa = qaTask('qa-1', 'dev-x', 'Only QA');
    const positions = new Map<string, TaskPosition>([
      ['qa-1', position({ taskId: 'qa-1', assignee: 'q', startDay: 0, startPart: 0, duration: 6 })],
    ]);
    const byDay = getOccupancyErrorDetailsByDay([qa], positions);
    expect(byDay.get(0)?.[0]?.reasons).toContain(OCCUPANCY_ERROR_MESSAGES.qa_without_dev);
    expect(byDay.get(1)?.[0]?.reasons).toContain(OCCUPANCY_ERROR_MESSAGES.qa_without_dev);
  });
});
