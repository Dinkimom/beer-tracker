import type { IssueTrackerIssue } from '@/lib/issueTrackerProvider';
import type { TrackerWebUrlContext } from '@/lib/issueTrackerProvider/issueTrackerUi';
import type { Task } from '@/types';

import { describe, expect, it, vi } from 'vitest';

import { loadIssueTaskJson } from '@/lib/issues/issueTrackerRouteJson';

const TRACKER_WEB: TrackerWebUrlContext = { kind: 'tracker', webBaseUrl: 'https://tracker.yandex.ru' };

const liveTask: Task = { id: 'RND-1', link: 'https://tracker/RND-1', name: 'Live', team: 'Web' };

function trackerStub(issue: IssueTrackerIssue | null) {
  return {
    getIssue: vi.fn(() => Promise.resolve(issue)),
    mapIssueToTask: vi.fn(() => liveTask),
  };
}

describe('loadIssueTaskJson', () => {
  it('falls back to the tracker when the issue has no snapshot', async () => {
    const issueTracker = trackerStub({ key: 'RND-1' } as IssueTrackerIssue);
    const task = await loadIssueTaskJson({
      issueKey: 'RND-1',
      issueTracker,
      snapshotRow: null,
      trackerWeb: TRACKER_WEB,
    });
    expect(task).toEqual(liveTask);
    expect(issueTracker.getIssue).toHaveBeenCalledWith('RND-1');
  });

  it('returns null when neither snapshot nor tracker has the issue', async () => {
    const task = await loadIssueTaskJson({
      issueKey: 'RND-404',
      issueTracker: trackerStub(null),
      snapshotRow: null,
      trackerWeb: TRACKER_WEB,
    });
    expect(task).toBeNull();
  });
});
