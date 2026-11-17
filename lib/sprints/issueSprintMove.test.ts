import type { IssueTrackerProviderClient } from '@/lib/issueTrackerProvider/types';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getIssueTrackerProviderClientForOrganization } from '@/lib/issueTrackerProvider/clientFactory';
import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';

import { moveIssuesForOrganization, sprintsToClearAfterMove } from './issueSprintMove';
import { deleteTaskLinksForTask } from './taskLinksRepository';
import { deleteTaskPosition, listTaskPositionSprintIds } from './taskPositionsRepository';

vi.mock('@/lib/issueTrackerProvider/clientFactory', () => ({ getIssueTrackerProviderClientForOrganization: vi.fn() }));
vi.mock('@/lib/issues/issueSprintMembershipRealtime', () => ({ completeIssueSprintMembershipChange: vi.fn() }));
vi.mock('@/lib/realtime/notifySprintRealtime', () => ({ notifySprintRealtime: vi.fn() }));
vi.mock('./taskLinksRepository', () => ({ deleteTaskLinksForTask: vi.fn() }));
vi.mock('./taskPositionsRepository', () => ({ deleteTaskPosition: vi.fn(), listTaskPositionSprintIds: vi.fn() }));

/** Спринт 10 закрыт, 35 и 36 идут. */
const STATUS: Record<number, string> = { 10: 'archived', 35: 'in_progress', 36: 'draft' };

function tracker(overrides: Partial<IssueTrackerProviderClient> = {}): IssueTrackerProviderClient {
  return {
    addIssueToSprint: vi.fn().mockResolvedValue({ affectedSprintIds: [35, 36], backlogBoardIds: [] }),
    getSprint: vi.fn((sprintId: number) => Promise.resolve({ status: STATUS[sprintId] })),
    replaceIssueSprints: vi.fn().mockResolvedValue({ affectedSprintIds: [35], backlogBoardIds: [] }),
    ...overrides,
  } as unknown as IssueTrackerProviderClient;
}

const cleared = () => vi.mocked(deleteTaskPosition).mock.calls.map(([input]) => input.sprintId);

describe('sprintsToClearAfterMove (K8)', () => {
  it('незакрытые доски, кроме целевой, если там задачу уже держал трекер', () => {
    const closed = new Set([10]);
    expect(sprintsToClearAfterMove({ cardSprintIds: [10, 35, 36], closedSprintIds: closed, keepTargetCard: false, targetSprintId: 36 })).toEqual([35, 36]);
    expect(sprintsToClearAfterMove({ cardSprintIds: [10, 35, 36], closedSprintIds: closed, keepTargetCard: true, targetSprintId: 36 })).toEqual([35]);
    expect(sprintsToClearAfterMove({ cardSprintIds: [10, 35], closedSprintIds: closed, keepTargetCard: false, targetSprintId: null })).toEqual([35]);
  });
});

describe('moveIssuesForOrganization (K8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('переносит в трекере и убирает карточку и стрелки с досок незакрытых спринтов', async () => {
    const issueTracker = tracker();
    vi.mocked(getIssueTrackerProviderClientForOrganization).mockResolvedValue(issueTracker);
    vi.mocked(listTaskPositionSprintIds).mockResolvedValue([10, 35, 36]);

    const [result] = await moveIssuesForOrganization({ issueKeys: ['A-1'], organizationId: 'org-1', target: { sprintId: 36 } });

    expect(issueTracker.addIssueToSprint).toHaveBeenCalledWith('A-1', 36);
    // Закрытый спринт 10 — история, не трогаем; старая карточка в целевом 36 сброшена, как перенос в планере (K4).
    expect(result).toEqual({ clearedSprintIds: [35, 36], issueKey: 'A-1', ok: true });
    expect(cleared()).toEqual([35, 36]);
    expect(vi.mocked(deleteTaskLinksForTask).mock.calls.map(([input]) => input.sprintId)).toEqual([35, 36]);
    expect(vi.mocked(notifySprintRealtime).mock.calls.map((call) => call[2])).toEqual([35, 36]);
  });

  it('задача уже в целевом спринте трекера: её карточка там остаётся, брошенная в другом спринте убирается', async () => {
    const issueTracker = tracker({
      addIssueToSprint: vi.fn().mockResolvedValue({ affectedSprintIds: [], backlogBoardIds: [] }),
    } as Partial<IssueTrackerProviderClient>);
    vi.mocked(getIssueTrackerProviderClientForOrganization).mockResolvedValue(issueTracker);
    // Агент раньше перенёс задачу в трекере в обход Beer Tracker: карточка осталась в 35, задача — в 36.
    vi.mocked(listTaskPositionSprintIds).mockResolvedValue([35, 36]);

    const [result] = await moveIssuesForOrganization({ issueKeys: ['A-1'], organizationId: 'org-1', target: { sprintId: 36 } });

    expect(result).toEqual({ clearedSprintIds: [35], issueKey: 'A-1', ok: true, trackerUnchanged: true });
  });

  it('в бэклог: задача выходит из спринтов трекера и с досок незакрытых спринтов', async () => {
    const issueTracker = tracker();
    vi.mocked(getIssueTrackerProviderClientForOrganization).mockResolvedValue(issueTracker);
    vi.mocked(listTaskPositionSprintIds).mockResolvedValue([10, 35]);

    const [result] = await moveIssuesForOrganization({ issueKeys: ['A-1'], organizationId: 'org-1', target: { backlog: true } });

    expect(issueTracker.replaceIssueSprints).toHaveBeenCalledWith('A-1', []);
    expect(result?.clearedSprintIds).toEqual([35]);
  });

  it('трекер отказал — доски не трогаем, остальные задачи переносятся', async () => {
    const issueTracker = tracker({
      addIssueToSprint: vi.fn((issueKey: string) =>
        issueKey === 'A-1'
          ? Promise.reject(new Error('no permission'))
          : Promise.resolve({ affectedSprintIds: [35, 36], backlogBoardIds: [] })
      ),
    } as Partial<IssueTrackerProviderClient>);
    vi.mocked(getIssueTrackerProviderClientForOrganization).mockResolvedValue(issueTracker);
    vi.mocked(listTaskPositionSprintIds).mockResolvedValue([35]);

    const results = await moveIssuesForOrganization({ issueKeys: ['A-1', 'A-2'], organizationId: 'org-1', target: { sprintId: 36 } });

    expect(results).toEqual([
      { clearedSprintIds: [], error: 'no permission', issueKey: 'A-1', ok: false },
      { clearedSprintIds: [35], issueKey: 'A-2', ok: true },
    ]);
    expect(vi.mocked(deleteTaskPosition).mock.calls.map(([input]) => input.taskId)).toEqual(['A-2']);
  });

  it('спринт, статус которого трекер не отдал, не чистим', async () => {
    const issueTracker = tracker({ getSprint: vi.fn().mockRejectedValue(new Error('timeout')) } as Partial<IssueTrackerProviderClient>);
    vi.mocked(getIssueTrackerProviderClientForOrganization).mockResolvedValue(issueTracker);
    vi.mocked(listTaskPositionSprintIds).mockResolvedValue([35]);

    const [result] = await moveIssuesForOrganization({ issueKeys: ['A-1'], organizationId: 'org-1', target: { sprintId: 36 } });

    expect(result?.clearedSprintIds).toEqual([]);
  });
});
