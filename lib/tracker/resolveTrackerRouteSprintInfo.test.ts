import type { SprintInfo, SprintListItem } from '@/types/tracker';

import { afterEach, describe, expect, it } from 'vitest';

import { apiCache, cacheKeys } from '@/lib/cache';
import { sprintInfoFromListItem } from '@/lib/sprints/sprintInfoFromListItem';

import { resolveTrackerRouteSprintInfo } from './resolveTrackerRouteSprintInfo';

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

afterEach(() => {
  apiCache.clear();
});

describe('resolveTrackerRouteSprintInfo', () => {
  it('returns sprintInfo already cached for the sprint id', () => {
    const cached: SprintInfo = { ...sprintInfoFromListItem(listItem), name: 'Cached' };
    apiCache.set(cacheKeys.sprintInfo(1974), cached, 60);

    expect(resolveTrackerRouteSprintInfo('381', 1974)?.name).toBe('Cached');
  });

  it('maps the sprint from the board sprints list cache', () => {
    apiCache.set(cacheKeys.sprints(381), [listItem], 60);

    expect(resolveTrackerRouteSprintInfo('381', 1974)).toEqual(sprintInfoFromListItem(listItem));
  });

  it('does not call out when the board list is missing', () => {
    expect(resolveTrackerRouteSprintInfo('381', 1974)).toBeNull();
  });

  it('returns null when the sprint is not on the cached board list', () => {
    apiCache.set(cacheKeys.sprints(381), [listItem], 60);

    expect(resolveTrackerRouteSprintInfo('381', 1)).toBeNull();
  });
});
