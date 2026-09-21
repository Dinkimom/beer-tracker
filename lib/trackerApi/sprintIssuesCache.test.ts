import { describe, expect, it } from 'vitest';

import { apiCache, cacheKeys } from '@/lib/cache';

import {
  getCachedSprintIssues,
  invalidateCachedSprintIssues,
  isTrackerSprintIssuesFrozen,
  patchCachedSprintIssueEstimates,
  patchCachedSprintIssueParent,
  patchCachedSprintIssueStatus,
  removeCachedSprintIssue,
  setCachedSprintIssues,
  sprintIssuesCacheTtlSeconds,
  SPRINT_ISSUES_CACHE_TTL_ACTIVE_SEC,
  SPRINT_ISSUES_CACHE_TTL_ARCHIVED_SEC,
  upsertCachedSprintIssue,
} from './sprintIssuesCache';

describe('sprintIssuesCache', () => {
  it('detects frozen sprint statuses', () => {
    expect(isTrackerSprintIssuesFrozen('archived')).toBe(true);
    expect(isTrackerSprintIssuesFrozen('released')).toBe(true);
    expect(isTrackerSprintIssuesFrozen('in_progress')).toBe(false);
  });

  it('uses longer TTL for archived sprints', () => {
    expect(sprintIssuesCacheTtlSeconds('archived')).toBe(SPRINT_ISSUES_CACHE_TTL_ARCHIVED_SEC);
    expect(sprintIssuesCacheTtlSeconds('in_progress')).toBe(SPRINT_ISSUES_CACHE_TTL_ACTIVE_SEC);
  });

  it('invalidateCachedSprintIssues removes cached sprint issues', () => {
    const sprintId = 424242;
    setCachedSprintIssues(sprintId, [{ id: '1', key: 'BT-1', self: '', summary: 'x' }], 'in_progress');
    expect(getCachedSprintIssues(sprintId)).not.toBeNull();

    invalidateCachedSprintIssues(sprintId);
    expect(getCachedSprintIssues(sprintId)).toBeNull();
    apiCache.delete(cacheKeys.sprintIssues(sprintId));
  });

  it('patchCachedSprintIssueEstimates updates only the matching issue', () => {
    const sprintId = 424243;
    setCachedSprintIssues(
      sprintId,
      [
        { id: '1', key: 'BT-1', self: '', summary: 'a', storyPoints: 3, testPoints: 2 },
        { id: '2', key: 'BT-2', self: '', summary: 'b', storyPoints: 5, testPoints: 1 },
      ],
      'in_progress'
    );

    patchCachedSprintIssueEstimates(sprintId, 'BT-1', { storyPoints: 8 });

    const cached = getCachedSprintIssues(sprintId);
    expect(cached?.[0]?.storyPoints).toBe(8);
    expect(cached?.[0]?.testPoints).toBe(2);
    expect(cached?.[1]?.storyPoints).toBe(5);
    apiCache.delete(cacheKeys.sprintIssues(sprintId));
  });

  it('patchCachedSprintIssueEstimates is a no-op when sprint is not cached', () => {
    patchCachedSprintIssueEstimates(999001, 'BT-1', { storyPoints: 8 });
    expect(getCachedSprintIssues(999001)).toBeNull();
  });

  it('patchCachedSprintIssueStatus updates only the matching issue', () => {
    const sprintId = 424244;
    setCachedSprintIssues(
      sprintId,
      [
        {
          id: '1',
          key: 'BT-1',
          self: '',
          summary: 'a',
          status: { key: 'open', display: 'Open' },
        },
        {
          id: '2',
          key: 'BT-2',
          self: '',
          summary: 'b',
          status: { key: 'open', display: 'Open' },
        },
      ],
      'in_progress'
    );

    patchCachedSprintIssueStatus(sprintId, 'BT-1', {
      status: { key: 'inProgress', display: 'In progress' },
      statusType: { key: 'inProgress', display: 'In progress' },
    });

    const cached = getCachedSprintIssues(sprintId);
    expect(cached?.[0]?.status).toEqual({ key: 'inProgress', display: 'In progress' });
    expect(cached?.[0]?.statusType).toEqual({ key: 'inProgress', display: 'In progress' });
    expect(cached?.[1]?.status).toEqual({ key: 'open', display: 'Open' });
    apiCache.delete(cacheKeys.sprintIssues(sprintId));
  });

  it('patchCachedSprintIssueParent updates or clears the parent', () => {
    const sprintId = 424247;
    const parent = {
      display: 'Стори',
      id: '10026',
      key: 'ST-9',
      self: '',
    };
    setCachedSprintIssues(
      sprintId,
      [
        { id: '1', key: 'BT-1', self: '', summary: 'a' },
        { id: '2', key: 'BT-2', parent, self: '', summary: 'b' },
      ],
      'in_progress'
    );

    patchCachedSprintIssueParent(sprintId, 'BT-1', parent);
    patchCachedSprintIssueParent(sprintId, 'BT-2', null);

    const cached = getCachedSprintIssues(sprintId);
    expect(cached?.[0]?.parent).toEqual(parent);
    expect(cached?.[1]?.parent).toBeUndefined();
    apiCache.delete(cacheKeys.sprintIssues(sprintId));
  });

  it('upsertCachedSprintIssue appends a new issue and replaces an existing one', () => {
    const sprintId = 424245;
    setCachedSprintIssues(
      sprintId,
      [{ id: '1', key: 'BT-1', self: '', summary: 'a' }],
      'in_progress'
    );
    upsertCachedSprintIssue(sprintId, { id: '2', key: 'BT-2', self: '', summary: 'b' });
    upsertCachedSprintIssue(sprintId, { id: '1', key: 'BT-1', self: '', summary: 'a-updated' });

    const cached = getCachedSprintIssues(sprintId);
    expect(cached).toEqual([
      { id: '1', key: 'BT-1', self: '', summary: 'a-updated' },
      { id: '2', key: 'BT-2', self: '', summary: 'b' },
    ]);
    apiCache.delete(cacheKeys.sprintIssues(sprintId));
  });

  it('removeCachedSprintIssue drops only the matching issue', () => {
    const sprintId = 424246;
    setCachedSprintIssues(
      sprintId,
      [
        { id: '1', key: 'BT-1', self: '', summary: 'a' },
        { id: '2', key: 'BT-2', self: '', summary: 'b' },
      ],
      'in_progress'
    );
    removeCachedSprintIssue(sprintId, 'BT-1');
    expect(getCachedSprintIssues(sprintId)?.map((issue) => issue.key)).toEqual(['BT-2']);
    apiCache.delete(cacheKeys.sprintIssues(sprintId));
  });
});
