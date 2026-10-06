import type { Task } from '@/types';
import type { TrackerIssue } from '@/types/tracker';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryIssueSnapshotsMatchingSprint } from '@/lib/snapshots/issueSnapshotSprintRead';
import { mapTrackerIssueToTask } from '@/lib/trackerApi/issues';

import { loadAssigneeVelocity } from './loadAssigneeVelocity';

vi.mock('@/lib/snapshots/issueSnapshotSprintRead', () => ({
  queryIssueSnapshotsMatchingSprint: vi.fn(),
}));

vi.mock('@/lib/trackerApi/issues', () => ({
  mapTrackerIssueToTask: vi.fn(),
}));

function task(partial: Partial<Task> & Pick<Task, 'id'>): Task {
  const { id, ...rest } = partial;
  return {
    id,
    link: 'https://t',
    name: 'Task',
    team: 'Web',
    ...rest,
  };
}

describe('loadAssigneeVelocity', () => {
  beforeEach(() => {
    vi.mocked(queryIssueSnapshotsMatchingSprint).mockReset();
    vi.mocked(mapTrackerIssueToTask).mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('averages closed points from tracker sprint issues', async () => {
    const done = task({ id: 'A-1', assignee: 'dev', status: 'done', storyPoints: 6 });
    const issueTracker = {
      getSprint: vi.fn().mockResolvedValue({ name: 'Sprint 12', status: 'archived' }),
      listSprintIssues: vi.fn().mockResolvedValue([{ key: 'A-1' }]),
      mapIssueToTask: vi.fn(() => done),
    };

    const result = await loadAssigneeVelocity({
      integration: null,
      issueTracker: issueTracker as never,
      organizationId: 'org',
      sprintIds: [12],
    });

    expect(queryIssueSnapshotsMatchingSprint).not.toHaveBeenCalled();
    expect(result).toEqual({
      sprintCount: 1,
      byAssignee: {
        dev: { averageSp: 6, averageTp: null, spSprintCount: 1, tpSprintCount: 0 },
      },
      byName: {},
    });
  });

  it('falls back to snapshots when the tracker sprint is empty', async () => {
    vi.mocked(queryIssueSnapshotsMatchingSprint).mockResolvedValue([
      { key: 'A-2' } as TrackerIssue,
    ]);
    vi.mocked(mapTrackerIssueToTask).mockReturnValue(
      task({ id: 'A-2', assignee: 'dev', status: 'done', storyPoints: 3 })
    );
    const issueTracker = {
      getSprint: vi.fn().mockResolvedValue({ name: 'Sprint 11', status: 'archived' }),
      listSprintIssues: vi.fn().mockResolvedValue([]),
      mapIssueToTask: vi.fn(),
    };

    const result = await loadAssigneeVelocity({
      integration: null,
      issueTracker: issueTracker as never,
      organizationId: 'org',
      sprintIds: [11],
    });

    expect(queryIssueSnapshotsMatchingSprint).toHaveBeenCalledWith('org', {
      sprintId: '11',
      sprintName: 'Sprint 11',
    });
    expect(result.byAssignee.dev?.averageSp).toBe(3);
  });

  it('drops a sprint the tracker and snapshots both failed to read', async () => {
    vi.mocked(queryIssueSnapshotsMatchingSprint).mockRejectedValue(new Error('db'));
    const issueTracker = {
      getSprint: vi.fn().mockRejectedValue(new Error('tracker')),
      listSprintIssues: vi.fn(),
      mapIssueToTask: vi.fn(),
    };

    const result = await loadAssigneeVelocity({
      integration: null,
      issueTracker: issueTracker as never,
      organizationId: 'org',
      sprintIds: [10],
    });

    expect(result).toEqual({ byAssignee: {}, byName: {}, sprintCount: 0 });
  });
});
