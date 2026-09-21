import type { SprintInfo, SprintListItem } from '@/types/tracker';

import { describe, expect, it } from 'vitest';

import { resolvePlannerSprintInfo, sprintInfoFromListItem } from './sprintInfoFromListItem';

const listItem: SprintListItem = {
  archived: false,
  board: { display: 'Board', id: '381', self: '' },
  createdAt: '2026-01-01T00:00:00.000+0000',
  createdBy: {
    cloudUid: '',
    display: '',
    id: '',
    passportUid: 0,
    self: '',
  },
  endDate: '2026-05-14',
  endDateTime: '2026-05-14T00:00:00.000+0000',
  id: 1974,
  name: 'Sprint 1974',
  self: '',
  startDate: '2026-05-01',
  startDateTime: '2026-05-01T00:00:00.000+0000',
  status: 'in_progress',
  version: 3,
};

describe('sprintInfoFromListItem', () => {
  it('maps list fields used by the planner', () => {
    expect(sprintInfoFromListItem(listItem)).toEqual({
      endDate: '2026-05-14',
      endDateTime: '2026-05-14T00:00:00.000+0000',
      id: 1974,
      name: 'Sprint 1974',
      startDate: '2026-05-01',
      startDateTime: '2026-05-01T00:00:00.000+0000',
      status: 'in_progress',
      version: 3,
    });
  });
});

describe('resolvePlannerSprintInfo', () => {
  it('prefers the tasks payload when present', () => {
    const fromTasks: SprintInfo = {
      ...sprintInfoFromListItem(listItem),
      name: 'From tracker route',
    };
    expect(resolvePlannerSprintInfo(fromTasks, listItem)?.name).toBe('From tracker route');
  });

  it('falls back to the sprints list when the tasks payload has no sprintInfo', () => {
    expect(resolvePlannerSprintInfo(null, listItem)).toEqual(sprintInfoFromListItem(listItem));
  });

  it('returns null when neither source has the sprint', () => {
    expect(resolvePlannerSprintInfo(null, undefined)).toBeNull();
  });
});
