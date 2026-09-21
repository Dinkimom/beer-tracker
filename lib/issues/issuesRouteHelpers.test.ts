import type { SprintRealtimeMessage } from '@/lib/realtime/sprintRealtimeTypes';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiCache, cacheKeys } from '@/lib/cache';
import { resetSprintRealtimeBusForTests, subscribeLocalSprintRealtime } from '@/lib/realtime/sprintRealtimeBus';
import { TENANT_ORG_HEADER } from '@/lib/tenantHttpConstants';
import {
  getCachedSprintIssues,
  setCachedSprintIssues,
} from '@/lib/trackerApi/sprintIssuesCache';

import { buildCreateIssueRequestBody, completeIssueParentChange, completeIssueStatusChange, sprintIdsFromIssueSprint, syncPlannerIssueParentAfterTrackerUpdate } from './issuesRouteHelpers';

vi.mock('@/lib/env', () => ({
  getRedisUrl: () => undefined,
}));

describe('issuesRouteHelpers', () => {
  afterEach(() => {
    resetSprintRealtimeBusForTests();
    apiCache.delete(cacheKeys.sprintIssues(77));
  });

  it('parses sprint ids from Tracker issue.sprint', () => {
    expect(sprintIdsFromIssueSprint([{ id: '12' }, '15', { id: 'nope' }])).toEqual([12, 15]);
    expect(sprintIdsFromIssueSprint({ id: '12' })).toEqual([12]);
    expect(sprintIdsFromIssueSprint(null)).toEqual([]);
  });

  it('does not send a feature-draft parent or assignee to Tracker', () => {
    expect(
      buildCreateIssueRequestBody({
        assignee: 'feature-draft:1',
        parent: 'feature-draft:1',
        queue: 'BT',
        summary: 'Task',
      })
    ).toEqual({ queue: 'BT', summary: 'Task' });
    expect(
      buildCreateIssueRequestBody({
        assignee: 'dev-1',
        parent: 'ST-9',
        queue: 'BT',
        summary: 'Task',
      })
    ).toEqual({
      assignee: 'dev-1',
      parent: 'ST-9',
      queue: 'BT',
      summary: 'Task',
    });
  });

  it('patches the sprint issues cache and notifies tasks with the new status', async () => {
    setCachedSprintIssues(
      77,
      [
        {
          id: '1',
          key: 'BT-1',
          self: '',
          status: { key: 'open', display: 'Open' },
          summary: 'Move card',
        },
      ],
      'in_progress'
    );
    const received: SprintRealtimeMessage[] = [];
    const unsubscribe = subscribeLocalSprintRealtime((next) => {
      received.push(next);
    });

    completeIssueStatusChange({
      issueKey: 'BT-1',
      request: new Request('http://localhost/api/issues/BT-1/status', {
        headers: { [TENANT_ORG_HEADER]: 'org-1' },
      }),
      sprintIds: [77],
      statusKey: 'inProgress',
    });

    expect(getCachedSprintIssues(77)?.[0]?.status).toEqual({
      display: 'inProgress',
      key: 'inProgress',
    });
    await vi.waitFor(() => {
      expect(
        received.some(
          (event) =>
            event.type === 'sprint.changed' &&
            event.resources[0] === 'tasks' &&
            event.issueStatus?.issueKey === 'BT-1' &&
            event.issueStatus.statusKey === 'inProgress'
        )
      ).toBe(true);
    });
    unsubscribe();
  });

  it('patches sprint cache parent after a tracker parent change', async () => {
    setCachedSprintIssues(
      77,
      [{ id: '1', key: 'BT-1', self: '', summary: 'Child' }],
      'in_progress'
    );
    const received: SprintRealtimeMessage[] = [];
    const unsubscribe = subscribeLocalSprintRealtime((next) => {
      received.push(next);
    });

    completeIssueParentChange({
      issueKey: 'BT-1',
      parent: { display: 'Стори', id: '10026', key: 'ST-9', self: '' },
      request: new Request('http://localhost/api/issues/BT-1', {
        headers: { [TENANT_ORG_HEADER]: 'org-1' },
      }),
      sprintIds: [77],
    });

    expect(getCachedSprintIssues(77)?.[0]?.parent).toEqual({
      display: 'Стори',
      id: '10026',
      key: 'ST-9',
      self: '',
    });
    await vi.waitFor(() => {
      expect(
        received.some(
          (event) => event.type === 'sprint.changed' && event.resources[0] === 'tasks'
        )
      ).toBe(true);
    });
    unsubscribe();
  });

  it('reads parent and sprint from Tracker after update, with planner sprint fallback', async () => {
    setCachedSprintIssues(
      77,
      [{ id: '1', key: 'BT-1', self: '', summary: 'Child' }],
      'in_progress'
    );
    await syncPlannerIssueParentAfterTrackerUpdate({
      issueKey: 'BT-1',
      issueTracker: {
        getIssue: () =>
          Promise.resolve({
            parent: { display: 'Стори', id: '10026', key: 'ST-9', self: '' },
            sprint: [{ id: '77' }],
          }),
      },
      parentKey: 'ST-9',
      request: new Request('http://localhost/api/issues/BT-1', {
        headers: { [TENANT_ORG_HEADER]: 'org-1' },
      }),
      sprintId: 77,
    });
    expect(getCachedSprintIssues(77)?.[0]?.parent?.key).toBe('ST-9');
  });
});
