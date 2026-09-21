import type { Task } from '@/types';
import type { TrackerIssue } from '@/types/tracker';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildIssueTrackerBurndownIssueFromPayloadAndLogs } from '@/lib/issueTrackerProvider/changelogNormalizer';
import { createYandexProviderClient } from '@/lib/issueTrackerProvider/yandexTrackerProvider';
import {
  BURNDOWN_API_RESPONSE_KEYS,
  buildComputedBurndownApiResponse,
  buildCreateSprintApiResponse,
  buildSprintScoreApiResponse,
} from '@/lib/sprints/sprintTrackerRouteJson';
import { resolveTrackerTestingFlowMode } from '@/lib/sprints/testingFlowMode';
import { createTrackerAxiosInstance } from '@/lib/trackerAxiosFactory';

import yandexChangelogLogs from './fixtures/yandexChangelogLogs.json';
import yandexIssueExpectedTask from './fixtures/yandexIssueExpectedTask.json';
import yandexIssueFull from './fixtures/yandexIssueFull.json';

vi.mock('@/lib/trackerAxiosFactory', () => ({
  createTrackerAxiosInstance: vi.fn((config: unknown) => ({ config })),
  requireTrackerAxiosForApiRoute: vi.fn((client: unknown) => client),
}));

const yandexIssue = yandexIssueFull as TrackerIssue;

const yandexBoardJson = {
  columns: [
    {
      display: 'Open',
      id: '1',
      self: 'https://tracker.test/column/1',
      statusKeys: ['open'],
    },
  ],
  id: 7,
  name: 'Board',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/boards/[boardId] JSON', () => {
  it('returns Yandex board params including kanban columns', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({ data: { id: 7, name: 'Board' } })
      .mockResolvedValueOnce({
        data: [
          {
            id: 1,
            name: 'Open',
            self: 'https://tracker.test/column/1',
            statuses: [{ key: 'open' }],
          },
        ],
      });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ get } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(client.getBoard(7)).resolves.toEqual(yandexBoardJson);
  });
});

describe('GET/POST /api/sprints JSON', () => {
  it('wraps a created Yandex sprint as { success, sprint }', () => {
    expect(buildCreateSprintApiResponse({ id: 12, name: 'Sprint 12' })).toEqual({
      sprint: { id: 12, name: 'Sprint 12' },
      success: true,
    });
  });
});

describe('GET /api/sprints/[sprintId]/score JSON', () => {
  it('returns rows plus testingFlowMode from Yandex-mapped tasks', () => {
    const body = buildSprintScoreApiResponse({
      goalsByTeam: [],
      snapshotTasks: [yandexIssueExpectedTask as Task],
      sprintId: 12,
      sprintName: 'Sprint 12',
      testingFlowMode: resolveTrackerTestingFlowMode(null),
    });

    expect(body.testingFlowMode).toBe('unknown');
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0]).toMatchObject({
      sname: 'Sprint 12',
      sp_done: 0,
      sp_left: 5,
      sprint_id: 12,
      team: '',
    });
  });

  it('maps tracker integration modes for the score envelope', () => {
    expect(resolveTrackerTestingFlowMode(null)).toBe('unknown');
    expect(resolveTrackerTestingFlowMode({ testingFlow: { mode: 'embedded_in_dev' } })).toBe(
      'embedded_in_dev'
    );
    expect(
      resolveTrackerTestingFlowMode({ testingFlow: { mode: 'standalone_qa_tasks' } })
    ).toBe('standalone_qa_tasks');
  });
});

describe('GET /api/sprints/[sprintId]/burndown JSON', () => {
  it('exposes the same envelope keys the burndown UI reads', () => {
    const ytrackerIssue = buildIssueTrackerBurndownIssueFromPayloadAndLogs(
      yandexIssue,
      yandexChangelogLogs,
      { sprintId: '9001', sprintName: 'Sprint 12' },
      'BT-100'
    );
    const body = buildComputedBurndownApiResponse({
      issueSummaries: new Map([['BT-100', 'Fix occupancy tooltip']]),
      sprintEndDate: new Date('2026-03-14T12:00:00.000Z'),
      sprintEndTime: Date.parse('2026-03-14T12:00:00.000Z'),
      sprintIdForMatch: '9001',
      sprintInfo: {
        endDate: '2026-03-14',
        name: 'Sprint 12',
        startDate: '2026-03-01',
      },
      sprintName: 'Sprint 12',
      sprintStartDate: new Date('2026-03-01T12:00:00.000Z'),
      sprintStartTime: Date.parse('2026-03-01T12:00:00.000Z'),
      testingFlowMode: 'unknown',
      ytrackerIssues: [ytrackerIssue],
    });

    expect(Object.keys(body).sort()).toEqual([...BURNDOWN_API_RESPONSE_KEYS].sort());
    expect(body).toMatchObject({
      sprintInfo: {
        endDate: '2026-03-14',
        name: 'Sprint 12',
        startDate: '2026-03-01',
      },
      testingFlowMode: 'unknown',
    });
    expect(body.dataPoints.length).toBeGreaterThan(0);
    expect(body.sprintTimelineTotals).toEqual(
      expect.objectContaining({
        remainingSP: expect.any(Number),
        totalSP: expect.any(Number),
      })
    );
  });
});
