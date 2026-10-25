import type { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { resolvePlannerAssigneeIdForTrackerSync } from '@/lib/staffTeams/resolvePlannerAssigneeForTrackerSync';

import { loadPersistedPositionsForPlannedSync } from './taskPositionsRepository';
import {
  trySyncPlannedDatesAfterPositionDelete,
  trySyncPositionAssigneeToTracker,
  withTrackerSyncFailures,
} from './taskPositionsTrackerSync';

vi.mock('@/lib/issueTrackerProvider/clientFactory', () => ({
  getIssueTrackerProviderClientFromRequest: vi.fn(),
}));
vi.mock('@/lib/staffTeams/resolvePlannerAssigneeForTrackerSync', () => ({
  resolvePlannerAssigneeIdForTrackerSync: vi.fn(),
  resolvePlannerAssigneeIdsForTrackerSync: vi.fn(),
}));
vi.mock('@/lib/trackerIntegration', () => ({
  loadTrackerIntegrationForTrackerPatch: vi.fn(() => Promise.resolve(null)),
}));
vi.mock('@/lib/trackerApi/sprintIssuesCache', () => ({ clearCachedSprintIssueScheduleDates: vi.fn() }));
vi.mock('./taskPositionsRepository', () => ({ loadPersistedPositionsForPlannedSync: vi.fn() }));

const client = vi.mocked(getIssueTrackerProviderClientFromRequest);
const resolveAssignee = vi.mocked(resolvePlannerAssigneeIdForTrackerSync);
const persisted = vi.mocked(loadPersistedPositionsForPlannedSync);
const updateIssue = vi.fn();
const request = {} as NextRequest;

describe('tracker sync failures after a position write', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    client.mockResolvedValue({ updateIssue } as never);
    resolveAssignee.mockResolvedValue('tracker-user-1');
  });

  it('reports the assignee of the dev issue when the tracker rejects the update', async () => {
    updateIssue.mockRejectedValue(new Error('403'));
    const failures = await trySyncPositionAssigneeToTracker({
      assigneeId: 'dev-1',
      devTaskKey: 'BT-1',
      isQa: true,
      logLabel: 'test',
      organizationId: 'org-1',
      request,
      taskId: 'BT-1-qa',
    });
    expect(failures).toEqual([{ field: 'assignee', issueKey: 'BT-1' }]);
  });

  it('reports nothing when the assignee reached the tracker', async () => {
    updateIssue.mockResolvedValue(undefined);
    const failures = await trySyncPositionAssigneeToTracker({
      assigneeId: 'dev-1',
      devTaskKey: undefined,
      isQa: false,
      logLabel: 'test',
      organizationId: 'org-1',
      request,
      taskId: 'BT-2',
    });
    expect(failures).toEqual([]);
  });

  it('reports dates when clearing them after the last position is deleted fails', async () => {
    persisted.mockResolvedValue(new Map());
    updateIssue.mockRejectedValue(new Error('timeout'));
    const failures = await trySyncPlannedDatesAfterPositionDelete({
      logLabel: 'test',
      request,
      sprintId: 7,
      taskId: 'BT-3',
    });
    expect(failures).toEqual([{ field: 'dates', issueKey: 'BT-3' }]);
  });

  it('adds failures to the response body only when there are any', () => {
    expect(withTrackerSyncFailures({ success: true }, [])).toEqual({ success: true });
    expect(withTrackerSyncFailures({ success: true }, [{ field: 'dates', issueKey: 'BT-3' }])).toEqual({
      success: true,
      trackerSyncFailures: [{ field: 'dates', issueKey: 'BT-3' }],
    });
  });
});
