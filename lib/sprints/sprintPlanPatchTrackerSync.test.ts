import type { SprintPlanPatchApplyOpResult } from './sprintPlanPatchTypes';

import { describe, expect, it, vi } from 'vitest';

import { completeIssueSprintMembershipChange } from '@/lib/issues/issueSprintMembershipRealtime';
import { getIssueTrackerProviderClientForOrganization } from '@/lib/issueTrackerProvider/clientFactory';

import {
  buildIssueNotInSprintPlanPatchHints,
  collectIssueNotInSprintWarnings,
  runPlanPatchTrackerSyncs,
} from './sprintPlanPatchTrackerSync';

vi.mock('@/lib/cache', () => ({ invalidateCache: { backlog: vi.fn() } }));
vi.mock('@/lib/issues/issueSprintMembershipRealtime', () => ({
  completeIssueSprintMembershipChange: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/lib/issueTrackerProvider/clientFactory', () => ({
  getIssueTrackerProviderClientForOrganization: vi.fn(),
}));
vi.mock('@/lib/staffTeams/resolvePlannerAssigneeForTrackerSync', () => ({
  resolvePlannerAssigneeIdForTrackerSync: vi.fn(),
}));

describe('collectIssueNotInSprintWarnings', () => {
  it('warns once per missing upsertPosition task', () => {
    expect(
      collectIssueNotInSprintWarnings(
        [
          {
            assigneeId: 'staff:a',
            duration: 1,
            op: 'upsertPosition',
            startDay: 0,
            startPart: 0,
            taskId: 'RND-1441',
          },
          {
            assigneeId: 'staff:a',
            duration: 1,
            op: 'upsertPosition',
            startDay: 1,
            startPart: 0,
            taskId: 'RND-1441',
          },
          {
            assigneeId: 'staff:a',
            duration: 1,
            op: 'upsertPosition',
            startDay: 0,
            startPart: 0,
            taskId: 'RND-1999',
          },
        ],
        new Set(['RND-1999'])
      )
    ).toEqual(['issue_not_in_sprint: RND-1441']);
  });
});

describe('buildIssueNotInSprintPlanPatchHints', () => {
  it('hints to re-propose with syncToTracker when missing from tracker sprint', () => {
    const ops = [
      {
        assigneeId: 'staff:a',
        duration: 2,
        op: 'upsertPosition' as const,
        segments: [
          { duration: 1, startDay: 0, startPart: 0 },
          { duration: 1, startDay: 1, startPart: 0 },
        ],
        startDay: 0,
        startPart: 0,
        taskId: 'RND-1915',
      },
    ];
    const hints = buildIssueNotInSprintPlanPatchHints(ops, [
      'issue_not_in_sprint: RND-1915',
    ]);
    expect(hints).toHaveLength(1);
    expect(hints[0]).toContain('syncToTracker:true');
    expect(hints[0]).toContain('segments');
    expect(hints[0]).toContain('RND-1915');
  });

  it('says a planner card still moves when the issue is missing from the tracker sprint', () => {
    const hint = buildIssueNotInSprintPlanPatchHints(
      [
        {
          assigneeId: 'staff:a',
          duration: 1,
          op: 'upsertPosition',
          startDay: 0,
          startPart: 0,
          taskId: 'RND-1779',
        },
      ],
      ['issue_not_in_sprint: RND-1779'],
      new Set(['RND-1779'])
    )[0];
    expect(hint).toContain('already on the planner');
    expect(hint).toContain('still applies without syncToTracker');
  });

  it('skips hint when syncToTracker is already set', () => {
    expect(
      buildIssueNotInSprintPlanPatchHints(
        [
          {
            assigneeId: 'staff:a',
            duration: 1,
            op: 'upsertPosition',
            startDay: 0,
            startPart: 0,
            syncToTracker: true,
            taskId: 'RND-1915',
          },
        ],
        ['issue_not_in_sprint: RND-1915']
      )
    ).toEqual([]);
  });
});

describe('runPlanPatchTrackerSyncs', () => {
  it('moves the issue to the target sprint and reports it on the op row', async () => {
    const addIssueToSprint = vi.fn(() =>
      Promise.resolve({ affectedSprintIds: [7, 8], backlogBoardIds: [] })
    );
    vi.mocked(getIssueTrackerProviderClientForOrganization).mockResolvedValue({
      addIssueToSprint,
    } as never);
    const applied: SprintPlanPatchApplyOpResult[] = [
      { detail: 'position BT-2 → sprint 8', index: 0, ok: true, op: 'deletePosition' },
    ];
    await runPlanPatchTrackerSyncs({
      applied,
      organizationId: 'org-1',
      sprintId: 7,
      trackerSyncs: [{ index: 0, moveToSprintId: 8, taskId: 'BT-2' }],
    });
    expect(addIssueToSprint).toHaveBeenCalledWith('BT-2', 8);
    expect(vi.mocked(completeIssueSprintMembershipChange).mock.calls[0]?.[0]).toMatchObject({
      addedSprintIds: [8],
      removedSprintIds: [7],
    });
    expect(applied[0]?.detail).toBe('position BT-2 → sprint 8; tracker sync: moved BT-2 to sprint 8');
  });

  it('keeps the BT change and warns when the tracker move fails', async () => {
    vi.mocked(getIssueTrackerProviderClientForOrganization).mockResolvedValue({
      addIssueToSprint: vi.fn(() => Promise.reject(new Error('403'))),
    } as never);
    const applied: SprintPlanPatchApplyOpResult[] = [
      { detail: 'position BT-3 → sprint 8', index: 0, ok: true, op: 'deletePosition' },
    ];
    await runPlanPatchTrackerSyncs({
      applied,
      organizationId: 'org-1',
      sprintId: 7,
      trackerSyncs: [{ index: 0, moveToSprintId: 8, taskId: 'BT-3' }],
    });
    expect(applied[0]?.detail).toBe('position BT-3 → sprint 8; tracker_sync_failed: BT-3: 403');
  });
});
