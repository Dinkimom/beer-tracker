import type { IssueTrackerIssue } from '@/lib/issueTrackerProvider/types';
import type { SprintRealtimeMessage } from '@/lib/realtime/sprintRealtimeTypes';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiCache, cacheKeys } from '@/lib/cache';
import { resetSprintRealtimeBusForTests, subscribeLocalSprintRealtime } from '@/lib/realtime/sprintRealtimeBus';
import { TENANT_ORG_HEADER } from '@/lib/tenantHttpConstants';
import {
  getCachedSprintIssues,
  setCachedSprintIssues,
} from '@/lib/trackerApi/sprintIssuesCache';

import { completeCreatedIssueInSprint, completeIssueSprintMembershipChange } from './issueSprintMembershipRealtime';

vi.mock('@/lib/env', () => ({
  getRedisUrl: () => undefined,
}));

vi.mock('@/lib/trackerIntegration', () => ({
  loadTrackerIntegrationForOrganization: () => Promise.resolve(null),
}));

const issue: IssueTrackerIssue = {
  id: '1',
  key: 'BT-1',
  provider: 'yandex-tracker',
  summary: 'Card',
};

const mappedTask = {
  id: 'BT-1',
  name: 'Card',
  team: 'Back' as const,
  link: 'https://tracker.yandex.ru/BT-1',
};

const issueTracker = {
  getIssue: () => Promise.resolve(issue),
  mapIssueToTask: () => mappedTask,
};

describe('completeIssueSprintMembershipChange', () => {
  afterEach(() => {
    resetSprintRealtimeBusForTests();
    apiCache.delete(cacheKeys.sprintIssues(10));
    apiCache.delete(cacheKeys.sprintIssues(11));
  });

  it('upserts into the target sprint cache, drops the previous sprint, and notifies both', async () => {
    setCachedSprintIssues(10, [{ id: '1', key: 'BT-1', self: '', summary: 'Card' }], 'in_progress');
    setCachedSprintIssues(11, [], 'in_progress');
    const received: SprintRealtimeMessage[] = [];
    const unsubscribe = subscribeLocalSprintRealtime((next) => {
      received.push(next);
    });

    await completeIssueSprintMembershipChange({
      addedSprintIds: [11],
      issueKey: 'BT-1',
      issueTracker,
      removedSprintIds: [10],
      request: new Request('http://localhost/api/issues/BT-1/sprint', {
        headers: { [TENANT_ORG_HEADER]: 'org-1' },
      }),
    });

    expect(getCachedSprintIssues(10)).toEqual([]);
    expect(getCachedSprintIssues(11)?.some((row) => row.key === 'BT-1')).toBe(true);
    await vi.waitFor(() => {
      expect(received).toHaveLength(2);
    });
    expect(
      received
        .filter((event) => event.type === 'sprint.changed')
        .map((event) => [event.sprintId, event.issueMembership?.action, event.issueMembership?.task?.id])
    ).toEqual([
      [11, 'added', 'BT-1'],
      [10, 'removed', undefined],
    ]);
    unsubscribe();
  });

  it('notifies the target sprint when a task is created directly into it', async () => {
    setCachedSprintIssues(11, [], 'in_progress');
    const received: SprintRealtimeMessage[] = [];
    const unsubscribe = subscribeLocalSprintRealtime((next) => {
      received.push(next);
    });

    await completeCreatedIssueInSprint({
      issueKey: 'BT-1',
      issueTracker,
      request: new Request('http://localhost/api/issues', {
        headers: { [TENANT_ORG_HEADER]: 'org-1' },
      }),
      sprintId: 11,
    });

    expect(getCachedSprintIssues(11)?.some((row) => row.key === 'BT-1')).toBe(true);
    await vi.waitFor(() => {
      expect(
        received.some(
          (event) =>
            event.type === 'sprint.changed' &&
            event.sprintId === 11 &&
            event.issueMembership?.action === 'added'
        )
      ).toBe(true);
    });
    unsubscribe();
  });

  it('skips notify when create has no sprint', async () => {
    const received: SprintRealtimeMessage[] = [];
    const unsubscribe = subscribeLocalSprintRealtime((next) => {
      received.push(next);
    });

    await completeCreatedIssueInSprint({
      issueKey: 'BT-1',
      issueTracker,
      request: new Request('http://localhost/api/issues', {
        headers: { [TENANT_ORG_HEADER]: 'org-1' },
      }),
      sprintId: undefined,
    });

    expect(received).toEqual([]);
    unsubscribe();
  });
});
