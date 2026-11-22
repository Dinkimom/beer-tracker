import type { IssueTrackerIssue } from '@/lib/issueTrackerProvider/types';
import type { SprintRealtimeMessage } from '@/lib/realtime/sprintRealtimeTypes';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiCache, cacheKeys } from '@/lib/cache';
import { resetSprintRealtimeBusForTests, subscribeLocalSprintRealtime } from '@/lib/realtime/sprintRealtimeBus';
import { upsertIssueSnapshotsForOrg } from '@/lib/snapshots';
import { deleteTaskLinksForTask } from '@/lib/sprints/taskLinksRepository';
import { deleteTaskPosition } from '@/lib/sprints/taskPositionsRepository';
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

vi.mock('@/lib/sprints/taskPositionsRepository', () => ({ deleteTaskPosition: vi.fn() }));
vi.mock('@/lib/snapshots', () => ({ upsertIssueSnapshotsForOrg: vi.fn(() => Promise.resolve(1)) }));
vi.mock('@/lib/sprints/taskLinksRepository', () => ({ deleteTaskLinksForTask: vi.fn() }));

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

/** Спринт 9 закрыт, 10 и 11 идут. */
const SPRINT_STATUS: Record<number, string> = { 9: 'archived', 10: 'in_progress', 11: 'draft' };

const issueTracker = {
  organizationId: 'org-1',
  getIssue: () => Promise.resolve(issue),
  getSprint: (sprintId: number) => Promise.resolve({ status: SPRINT_STATUS[sprintId] } as never),
  mapIssueToTask: () => mappedTask,
};

describe('completeIssueSprintMembershipChange', () => {
  it('задача ушла из незакрытого спринта — её карточка и стрелки с его доски уходят; закрытый не трогаем', async () => {
    vi.mocked(deleteTaskPosition).mockClear();
    vi.mocked(deleteTaskLinksForTask).mockClear();
    await completeIssueSprintMembershipChange({
      addedSprintIds: [11],
      issueKey: 'BT-1',
      issueTracker,
      removedSprintIds: [9, 10],
      request: new Request('http://localhost/api/issues/BT-1/sprint', { headers: { [TENANT_ORG_HEADER]: 'org-1' } }),
    });
    expect(vi.mocked(deleteTaskPosition).mock.calls.map(([input]) => input.sprintId)).toEqual([10]);
    expect(deleteTaskLinksForTask).toHaveBeenCalledWith({ organizationId: 'org-1', sprintId: 10, taskId: 'BT-1' });
  });

  it('снятая со спринта задача сразу обновляет снимок: бэклог видит её без ожидания синхронизации', async () => {
    vi.mocked(upsertIssueSnapshotsForOrg).mockClear();
    await completeIssueSprintMembershipChange({
      addedSprintIds: [],
      issueKey: 'BT-1',
      issueTracker,
      removedSprintIds: [10],
      request: new Request('http://localhost/api/issues/BT-1/sprint', { headers: { [TENANT_ORG_HEADER]: 'org-1' } }),
    });
    expect(upsertIssueSnapshotsForOrg).toHaveBeenCalledWith(
      'org-1',
      [expect.objectContaining({ key: 'BT-1' })],
      { provider: 'yandex-tracker' }
    );
  });

  afterEach(() => {
    resetSprintRealtimeBusForTests();
    apiCache.delete(cacheKeys.sprintIssues('org-1', 10));
    apiCache.delete(cacheKeys.sprintIssues('org-1', 11));
  });

  it('upserts into the target sprint cache, drops the previous sprint, and notifies both', async () => {
    setCachedSprintIssues('org-1', 10, [{ id: '1', key: 'BT-1', self: '', summary: 'Card' }], 'in_progress');
    setCachedSprintIssues('org-1', 11, [], 'in_progress');
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

    expect(getCachedSprintIssues('org-1', 10)).toEqual([]);
    expect(getCachedSprintIssues('org-1', 11)?.some((row) => row.key === 'BT-1')).toBe(true);
    await vi.waitFor(() => {
      expect(received).toHaveLength(3);
    });
    expect(
      received
        .filter((event) => event.type === 'sprint.changed')
        .map((event) => [event.sprintId, event.issueMembership?.action, event.issueMembership?.task?.id])
    ).toEqual([
      [11, 'added', 'BT-1'],
      [10, 'removed', undefined],
      // Карточка ушла с доски покинутого спринта: вкладки перечитывают позиции и стрелки.
      [10, undefined, undefined],
    ]);
    unsubscribe();
  });

  it('notifies the target sprint when a task is created directly into it', async () => {
    setCachedSprintIssues('org-1', 11, [], 'in_progress');
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

    expect(getCachedSprintIssues('org-1', 11)?.some((row) => row.key === 'BT-1')).toBe(true);
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
