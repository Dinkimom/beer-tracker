import type { Task } from '@/types';

import toast from 'react-hot-toast';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getTasksToMoveOnSprintFinish,
  isTaskClosedForSprintFinish,
  resolveFinishSprintDefaultMoveTarget,
  validateFinishSprintSubmit,
} from './useFinishSprintModalHelpers';

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

const toastErrorMock = vi.mocked(toast.error);

function task(overrides: Partial<Task>): Task {
  return {
    id: 'TASK-1',
    link: '',
    name: 'Task',
    team: 'Back',
    ...overrides,
  };
}

function moveTargetSprint(overrides: {
  archived?: boolean;
  id: number;
  name: string;
  startDate?: string;
  status?: string;
}) {
  return {
    archived: overrides.archived ?? false,
    id: overrides.id,
    name: overrides.name,
    startDate: overrides.startDate ?? '',
    status: overrides.status ?? 'draft',
  };
}

describe('finish sprint task transfer', () => {
  it('treats only closed tasks as non-transferable', () => {
    expect(isTaskClosedForSprintFinish(task({ originalStatus: 'closed' }))).toBe(true);
    expect(isTaskClosedForSprintFinish(task({ originalStatus: 'Closed' }))).toBe(true);
    expect(isTaskClosedForSprintFinish(task({ originalStatus: 'rc' }))).toBe(false);
  });

  it('moves rc tasks and skips only goal and closed tasks', () => {
    const tasks = [
      task({ id: 'GOAL-1', originalStatus: 'open' }),
      task({ id: 'TASK-2', originalStatus: 'closed' }),
      task({ id: 'TASK-3', originalStatus: 'rc' }),
      task({ id: 'TASK-4', originalStatus: 'inProgress' }),
    ];

    expect(getTasksToMoveOnSprintFinish(tasks, new Set(['GOAL-1'])).map(t => t.id)).toEqual([
      'TASK-3',
      'TASK-4',
    ]);
  });
});

describe('validateFinishSprintSubmit', () => {
  const sprintInfo = { id: 1, status: 'in_progress' };

  beforeEach(() => {
    toastErrorMock.mockReset();
  });

  it('rejects submit when sprint info is missing', () => {
    expect(validateFinishSprintSubmit({
      moveTasksTo: 'backlog',
      selectedSprintId: null,
      sprintInfo: null,
    })).toBe(false);
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it('requires a sprint when unfinished tasks should move to a sprint', () => {
    expect(validateFinishSprintSubmit({
      moveTasksTo: 'sprint',
      selectedSprintId: null,
      sprintInfo,
    })).toBe(false);
    expect(toastErrorMock).toHaveBeenCalledWith('Необходимо выбрать спринт для переноса задач');
  });

  it('allows backlog transfer without a selected sprint', () => {
    expect(validateFinishSprintSubmit({
      moveTasksTo: 'backlog',
      selectedSprintId: null,
      sprintInfo,
    })).toBe(true);
    expect(toastErrorMock).not.toHaveBeenCalled();
  });
});

describe('resolveFinishSprintDefaultMoveTarget', () => {
  it('selects the next draft sprint after the current one', () => {
    expect(resolveFinishSprintDefaultMoveTarget({
      currentSprintId: 1,
      sprints: [
        moveTargetSprint({ id: 1, name: 'Booking 2608', startDate: '2026-08-25', status: 'in_progress' }),
        moveTargetSprint({ id: 3, name: 'Booking 2610', startDate: '2026-09-22' }),
        moveTargetSprint({ id: 2, name: 'Booking 2609', startDate: '2026-09-08' }),
      ],
    })).toEqual({ moveTasksTo: 'sprint', selectedSprintId: 2 });
  });

  it('falls back to backlog when there is no later draft sprint', () => {
    expect(resolveFinishSprintDefaultMoveTarget({
      currentSprintId: 2,
      sprints: [
        moveTargetSprint({ id: 1, name: 'Booking 2607', startDate: '2026-08-11' }),
        moveTargetSprint({ id: 2, name: 'Booking 2608', startDate: '2026-08-25', status: 'in_progress' }),
      ],
    })).toEqual({ moveTasksTo: 'backlog', selectedSprintId: null });
  });

  it('falls back to backlog when there are no draft sprints', () => {
    expect(resolveFinishSprintDefaultMoveTarget({
      currentSprintId: 1,
      sprints: [
        moveTargetSprint({ id: 1, name: 'Booking 2608', startDate: '2026-08-25', status: 'in_progress' }),
      ],
    })).toEqual({ moveTasksTo: 'backlog', selectedSprintId: null });
  });

  it('uses sprint numbers when dates are missing', () => {
    expect(resolveFinishSprintDefaultMoveTarget({
      currentSprintId: 1,
      sprints: [
        moveTargetSprint({ id: 1, name: 'Booking 2608', status: 'in_progress' }),
        moveTargetSprint({ id: 2, name: 'Booking 2609' }),
      ],
    })).toEqual({ moveTasksTo: 'sprint', selectedSprintId: 2 });
  });
});
