import type { SprintPlanPatchApplyOpResult, SprintPlanPatchOp } from './sprintPlanPatchTypes';

import { describe, expect, it, vi } from 'vitest';

import { completeIssueSprintMembershipChange } from '@/lib/issues/issueSprintMembershipRealtime';
import { getIssueTrackerProviderClientForOrganization } from '@/lib/issueTrackerProvider/clientFactory';
import { syncSprintGoalsToTracker } from '@/lib/sprintGoals';
import {
  syncPlannedDatesAfterRemoval,
  syncPlannedDatesToTracker,
} from '@/lib/sprints/taskPositionsTrackerSync';

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
vi.mock('@/lib/sprintGoals', () => ({
  syncSprintGoalsToTracker: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/lib/staffTeams/resolvePlannerAssigneeForTrackerSync', () => ({
  resolvePlannerAssigneeIdForTrackerSync: vi.fn(),
}));
vi.mock('@/lib/sprints/taskPositionsTrackerSync', () => ({
  resolvePositionIssueKey: ({ taskId }: { taskId: string }) => taskId,
  syncPlannedDatesAfterRemoval: vi.fn(() => Promise.resolve([])),
  syncPlannedDatesToTracker: vi.fn(() => Promise.resolve([])),
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

const GOAL_OPS: SprintPlanPatchOp[] = [
  { goalType: 'delivery', op: 'createGoal', text: 'g1' },
  { id: 'g2', op: 'deleteGoal' },
  { id: 'g3', op: 'updateGoal', text: 'g3' },
];

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
      ops: [{ moveToSprintId: 8, op: 'deletePosition', taskId: 'BT-2' }],
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
      ops: [{ moveToSprintId: 8, op: 'deletePosition', taskId: 'BT-3' }],
      organizationId: 'org-1',
      sprintId: 7,
      trackerSyncs: [{ index: 0, moveToSprintId: 8, taskId: 'BT-3' }],
    });
    expect(applied[0]?.detail).toBe('position BT-3 → sprint 8; tracker_sync_failed: BT-3: 403');
  });

  it('syncs sprint goals to the tracker once when goal ops applied', async () => {
    vi.mocked(syncSprintGoalsToTracker).mockClear();
    await runPlanPatchTrackerSyncs({
      applied: [
        { detail: 'goal g1', index: 0, ok: true, op: 'createGoal' },
        { detail: 'goal g2', index: 1, ok: true, op: 'deleteGoal' },
        { error: 'goal g3 not found', index: 2, ok: false, op: 'updateGoal' },
      ],
      ops: GOAL_OPS,
      organizationId: 'org-1',
      sprintId: 7,
      trackerSyncs: [],
    });
    expect(syncSprintGoalsToTracker).toHaveBeenCalledTimes(1);
    expect(vi.mocked(syncSprintGoalsToTracker).mock.calls[0]?.[0]).toMatchObject({ sprintId: 7 });
  });

  it('skips the goal sync when no goal op applied', async () => {
    vi.mocked(syncSprintGoalsToTracker).mockClear();
    await runPlanPatchTrackerSyncs({
      applied: [{ error: 'goal g3 not found', index: 0, ok: false, op: 'updateGoal' }],
      ops: [GOAL_OPS[2]!],
      organizationId: 'org-1',
      sprintId: 7,
      trackerSyncs: [],
    });
    expect(syncSprintGoalsToTracker).not.toHaveBeenCalled();
  });

  it('writes planned dates of moved dev cards to the tracker, skipping QA cards', async () => {
    vi.mocked(syncPlannedDatesToTracker).mockClear();
    const applied: SprintPlanPatchApplyOpResult[] = [
      { detail: 'position BT-4', index: 0, ok: true, op: 'upsertPosition' },
      { detail: 'position qa', index: 1, ok: true, op: 'upsertPosition' },
      { error: 'boom', index: 2, ok: false, op: 'upsertPosition' },
    ];
    await runPlanPatchTrackerSyncs({
      applied,
      ops: [
        { assigneeId: 'staff:a', duration: 3, op: 'upsertPosition', startDay: 2, startPart: 1, taskId: 'BT-4' },
        { assigneeId: 'staff:b', duration: 1, isQa: true, op: 'upsertPosition', startDay: 4, startPart: 0, taskId: 'BT-4-qa' },
        { assigneeId: 'staff:a', duration: 1, op: 'upsertPosition', startDay: 0, startPart: 0, taskId: 'BT-5' },
      ],
      organizationId: 'org-1',
      sprintId: 7,
      trackerSyncs: [],
    });
    expect(syncPlannedDatesToTracker).toHaveBeenCalledTimes(1);
    expect(vi.mocked(syncPlannedDatesToTracker).mock.calls[0]?.[0]).toMatchObject({
      positions: [
        { duration: 3, isQa: false, plannedDuration: 3, plannedStartDay: 2, plannedStartPart: 1, taskId: 'BT-4' },
      ],
      sprintId: 7,
    });
    expect(applied[0]?.detail).toBe('position BT-4; tracker sync: dates');
    expect(applied[1]?.detail).toBe('position qa');
  });

  it('clears tracker dates when the agent takes a card off the board', async () => {
    vi.mocked(syncPlannedDatesAfterRemoval).mockClear();
    vi.mocked(syncPlannedDatesAfterRemoval).mockResolvedValueOnce([{ field: 'dates', issueKey: 'BT-6' }]);
    const applied: SprintPlanPatchApplyOpResult[] = [
      { detail: 'position BT-6', index: 0, ok: true, op: 'deletePosition' },
      { detail: 'position 6ba7b810-9dad-11d1-80b4-00c04fd430c8', index: 1, ok: true, op: 'deletePosition' },
    ];
    await runPlanPatchTrackerSyncs({
      applied,
      ops: [
        { op: 'deletePosition', taskId: 'BT-6' },
        { op: 'deletePosition', taskId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8' },
      ],
      organizationId: 'org-1',
      sprintId: 7,
      trackerSyncs: [],
    });
    expect(syncPlannedDatesAfterRemoval).toHaveBeenCalledTimes(1);
    expect(vi.mocked(syncPlannedDatesAfterRemoval).mock.calls[0]?.[0]).toMatchObject({
      issueKey: 'BT-6',
      sprintId: 7,
    });
    expect(applied[0]?.detail).toBe('position BT-6; tracker_dates_sync_failed: BT-6');
  });

  it('leaves dates alone when the card moves to another sprint', async () => {
    vi.mocked(syncPlannedDatesAfterRemoval).mockClear();
    vi.mocked(getIssueTrackerProviderClientForOrganization).mockResolvedValue({
      addIssueToSprint: vi.fn(() => Promise.resolve({ affectedSprintIds: [7, 8], backlogBoardIds: [] })),
    } as never);
    await runPlanPatchTrackerSyncs({
      applied: [{ detail: 'position BT-7 → sprint 8', index: 0, ok: true, op: 'deletePosition' }],
      ops: [{ moveToSprintId: 8, op: 'deletePosition', taskId: 'BT-7' }],
      organizationId: 'org-1',
      sprintId: 7,
      trackerSyncs: [{ index: 0, moveToSprintId: 8, taskId: 'BT-7' }],
    });
    expect(syncPlannedDatesAfterRemoval).not.toHaveBeenCalled();
  });
});
