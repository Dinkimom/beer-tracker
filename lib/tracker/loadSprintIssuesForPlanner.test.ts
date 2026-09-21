import type { TrackerIssue } from '@/types/tracker';

import { describe, expect, it, vi } from 'vitest';

import { loadSprintIssuesForPlanner } from './loadSprintIssuesForPlanner';

function issue(key: string): TrackerIssue {
  return { id: key, key, self: '', summary: key };
}

function createDeps() {
  return {
    fetchFromTracker: vi.fn().mockResolvedValue([issue('TR-1')]),
    getCached: vi.fn().mockReturnValue(null),
    getTeamTitleByBoardId: vi.fn().mockResolvedValue({ title: 'Platform' }),
    querySnapshots: vi.fn().mockResolvedValue([issue('PG-1'), issue('PG-2')]),
    scheduleTrackerRefresh: vi.fn(),
    setCached: vi.fn(),
  };
}

const baseParams = {
  boardId: '381',
  forceRefresh: false,
  issueTracker: {} as never,
  organizationId: '11111111-1111-4111-8111-111111111111',
  sprintId: 1974,
};

describe('loadSprintIssuesForPlanner', () => {
  it('returns in-memory cache without hitting PG or Tracker', async () => {
    const deps = createDeps();
    deps.getCached.mockReturnValue([issue('MEM-1')]);

    const result = await loadSprintIssuesForPlanner(baseParams, deps);

    expect(result).toEqual([issue('MEM-1')]);
    expect(deps.querySnapshots).not.toHaveBeenCalled();
    expect(deps.fetchFromTracker).not.toHaveBeenCalled();
    expect(deps.scheduleTrackerRefresh).not.toHaveBeenCalled();
  });

  it('serves a PG snapshot and warms Tracker in the background', async () => {
    const deps = createDeps();

    const result = await loadSprintIssuesForPlanner(baseParams, deps);

    expect(result.map((row) => row.key)).toEqual(['PG-1', 'PG-2']);
    expect(deps.querySnapshots).toHaveBeenCalledWith(baseParams.organizationId, {
      functionalTeamExact: 'Platform',
      omitLogsAndComments: true,
      sprintId: '1974',
      sprintName: '',
    });
    expect(deps.setCached).toHaveBeenCalledWith(1974, [issue('PG-1'), issue('PG-2')], undefined);
    expect(deps.scheduleTrackerRefresh).toHaveBeenCalledWith(1974, baseParams.issueTracker);
    expect(deps.fetchFromTracker).not.toHaveBeenCalled();
  });

  it('falls back to Tracker when the snapshot is empty', async () => {
    const deps = createDeps();
    deps.querySnapshots.mockResolvedValue([]);

    const result = await loadSprintIssuesForPlanner(baseParams, deps);

    expect(result).toEqual([issue('TR-1')]);
    expect(deps.scheduleTrackerRefresh).not.toHaveBeenCalled();
    expect(deps.fetchFromTracker).toHaveBeenCalledWith(baseParams.issueTracker, 1974, {
      forceRefresh: false,
    });
  });

  it('skips snapshot on forceRefresh', async () => {
    const deps = createDeps();

    await loadSprintIssuesForPlanner({ ...baseParams, forceRefresh: true }, deps);

    expect(deps.getCached).not.toHaveBeenCalled();
    expect(deps.querySnapshots).not.toHaveBeenCalled();
    expect(deps.fetchFromTracker).toHaveBeenCalledWith(baseParams.issueTracker, 1974, {
      forceRefresh: true,
    });
  });

  it('forwards known sprint status to Tracker fallback', async () => {
    const deps = createDeps();
    deps.querySnapshots.mockResolvedValue([]);

    await loadSprintIssuesForPlanner({ ...baseParams, sprintStatus: 'in_progress' }, deps);

    expect(deps.fetchFromTracker).toHaveBeenCalledWith(baseParams.issueTracker, 1974, {
      forceRefresh: false,
      sprintStatus: 'in_progress',
    });
  });

  it('falls back to Tracker when the board has no team title', async () => {
    const deps = createDeps();
    deps.getTeamTitleByBoardId.mockResolvedValue(null);

    const result = await loadSprintIssuesForPlanner(baseParams, deps);

    expect(result).toEqual([issue('TR-1')]);
    expect(deps.querySnapshots).not.toHaveBeenCalled();
  });
});
