import type { TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import { isValidSprintId, stripPositionSource, taskPositionToApi } from './taskPositionToApi';

function basePosition(overrides: Partial<TaskPosition> = {}): TaskPosition {
  return {
    assignee: 'dev-1',
    duration: 2,
    startDay: 1,
    startPart: 0,
    taskId: 'TASK-1',
    ...overrides,
  };
}

describe('isValidSprintId', () => {
  it('отклоняет null, undefined и -1', () => {
    expect(isValidSprintId(null)).toBe(false);
    expect(isValidSprintId(undefined)).toBe(false);
    expect(isValidSprintId(-1)).toBe(false);
  });

  it('принимает положительный id', () => {
    expect(isValidSprintId(42)).toBe(true);
  });
});

describe('taskPositionToApi', () => {
  it('маппит базовые поля dev-задачи', () => {
    const p = basePosition();
    expect(taskPositionToApi(p, false)).toMatchObject({
      taskId: 'TASK-1',
      assigneeId: 'dev-1',
      startDay: 1,
      startPart: 0,
      duration: 2,
      isQa: false,
    });
  });

  it('добавляет devTaskKey для QA', () => {
    const p = basePosition();
    expect(taskPositionToApi(p, true, 'DEV-99')).toMatchObject({
      isQa: true,
      devTaskKey: 'DEV-99',
    });
  });

  it('передаёт segments при непустом массиве', () => {
    const p = basePosition({
      segments: [{ startDay: 0, startPart: 0, duration: 1 }],
    });
    const api = taskPositionToApi(p, false);
    expect(api.segments).toEqual([{ startDay: 0, startPart: 0, duration: 1 }]);
  });
});

describe('stripPositionSource', () => {
  it('убирает __source с позиции', () => {
    const p = basePosition() as TaskPosition & { __source?: string };
    p.__source = 'debug';
    const stripped = stripPositionSource(p);
    expect(stripped).not.toHaveProperty('__source');
    expect(stripped.taskId).toBe('TASK-1');
  });
});
