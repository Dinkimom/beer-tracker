import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import { slimSprintPlannerListTask } from './slimSprintPlannerListTask';

const fatTask: Task = {
  id: 'VER-1',
  name: 'Task',
  team: 'Back',
  link: 'https://tracker.yandex.ru/VER-1',
  description: 'Long markdown body',
  createdAt: '2026-08-01T00:00:00.000+0000',
  updatedAt: '2026-08-20T00:00:00.000+0000',
  resolvedAt: '2026-08-21T00:00:00.000+0000',
  assignee: 'u1',
  assigneeName: 'Ada',
  storyPoints: 3,
  parent: {
    id: 'abc',
    key: 'VER-100',
    display: 'Epic',
    self: 'https://st-api.yandex-team.ru/v2/issues/VER-100',
  },
  epic: {
    id: 'def',
    key: 'VER-1008',
    display: 'Bugs',
    self: 'https://st-api.yandex-team.ru/v2/issues/VER-1008',
  },
  sprints: [
    {
      id: '1974',
      display: 'Verticals 2617',
      startDate: '2026-08-24',
      endDate: '2026-09-06',
    },
  ],
};

describe('slimSprintPlannerListTask', () => {
  it('drops description and update timestamps', () => {
    const slim = slimSprintPlannerListTask(fatTask);
    expect(slim).not.toHaveProperty('description');
    expect(slim).not.toHaveProperty('updatedAt');
    expect(slim).not.toHaveProperty('resolvedAt');
    expect(slim.link).toBe('https://tracker.yandex.ru/VER-1');
  });

  it('keeps board fields and createdAt', () => {
    const slim = slimSprintPlannerListTask(fatTask);
    expect(slim.id).toBe('VER-1');
    expect(slim.name).toBe('Task');
    expect(slim.assignee).toBe('u1');
    expect(slim.assigneeName).toBe('Ada');
    expect(slim.storyPoints).toBe(3);
    expect(slim.createdAt).toBe('2026-08-01T00:00:00.000+0000');
  });

  it('strips Tracker self URLs from parent and epic', () => {
    const slim = slimSprintPlannerListTask(fatTask);
    expect(slim.parent).toEqual({ id: 'abc', key: 'VER-100', display: 'Epic' });
    expect(slim.epic).toEqual({ id: 'def', key: 'VER-1008', display: 'Bugs' });
  });

  it('keeps sprint id and display only', () => {
    expect(slimSprintPlannerListTask(fatTask).sprints).toEqual([
      { id: '1974', display: 'Verticals 2617' },
    ]);
  });
});
