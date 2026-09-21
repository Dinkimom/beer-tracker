import type { TrackerIssue } from '@/types/tracker';

import { NextResponse } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

import {
  buildIssueDetailResponse,
  resolveIssueDetailSource,
} from '@/lib/issues/issueDetailRouteHelpers';
import {
  buildIssueSearchApiResponse,
  buildTransitionsBatchApiResponse,
  taskJsonFromSnapshotRow,
} from '@/lib/issues/issueTrackerRouteJson';
import { wrapIssueSnapshotForStorage } from '@/lib/issueTrackerProvider/snapshotEnvelope';
import {
  createYandexProviderClient,
  normalizeYandexIssue,
} from '@/lib/issueTrackerProvider/yandexTrackerProvider';
import { mapTeamsToPlannerBoards } from '@/lib/staffTeams/plannerBoards';
import { createTrackerAxiosInstance } from '@/lib/trackerAxiosFactory';

import yandexIssueExpectedDetail from './fixtures/yandexIssueExpectedDetail.json';
import yandexIssueExpectedTask from './fixtures/yandexIssueExpectedTask.json';
import yandexIssueFull from './fixtures/yandexIssueFull.json';

vi.mock('@/lib/trackerAxiosFactory', () => ({
  createTrackerAxiosInstance: vi.fn((config: unknown) => ({ config })),
  requireTrackerAxiosForApiRoute: vi.fn((client: unknown) => client),
}));

const yandexIssue = yandexIssueFull as TrackerIssue;
const yandexChecklist = yandexIssueExpectedDetail.checklistItems;

const yandexTransitions = [
  {
    display: 'Start Progress',
    id: 'startProgress',
    screen: { id: 'screen-1' },
    to: { display: 'In Progress', key: 'inProgress' },
  },
];

function yandexMapIssueToTask() {
  return createYandexProviderClient({
    oauthToken: 'token-1',
    orgId: 'org-1',
  }).mapIssueToTask;
}

describe('GET /api/issues/[issueKey]/task JSON', () => {
  it('maps a Yandex snapshot row to the Task card JSON', () => {
    expect(taskJsonFromSnapshotRow({ payload: yandexIssue }, null)).toEqual(
      yandexIssueExpectedTask
    );
  });

  it('maps a Yandex snapshot envelope to the same Task JSON', () => {
    expect(
      taskJsonFromSnapshotRow(
        { payload: wrapIssueSnapshotForStorage('yandex-tracker', yandexIssue) },
        null
      )
    ).toEqual(yandexIssueExpectedTask);
  });
});

describe('GET /api/issues/[issueKey] JSON', () => {
  it('prefers an unwrapped Yandex snapshot over a live tracker issue', async () => {
    const issue = await resolveIssueDetailSource({
      findIssueSnapshot: () =>
        Promise.resolve({
          payload: wrapIssueSnapshotForStorage('yandex-tracker', yandexIssue),
        }),
      getIssue: () =>
        Promise.resolve({
          key: 'BT-LIVE',
          summary: 'Should not be used',
        }),
      organizationId: 'org-1',
      validIssueKey: 'BT-100',
    });

    expect(issue).not.toBeInstanceOf(NextResponse);
    expect(buildIssueDetailResponse(issue as never, yandexChecklist)).toEqual(
      yandexIssueExpectedDetail
    );
  });

  it('falls back to the live Yandex issue when the snapshot is missing', async () => {
    const issue = await resolveIssueDetailSource({
      findIssueSnapshot: () => Promise.resolve(null),
      getIssue: () => Promise.resolve(normalizeYandexIssue(yandexIssue)),
      organizationId: 'org-1',
      validIssueKey: 'BT-100',
    });

    expect(issue).not.toBeInstanceOf(NextResponse);
    expect(buildIssueDetailResponse(issue as never, yandexChecklist)).toMatchObject({
      key: 'BT-100',
      resolvedAt: null,
      summary: 'Fix occupancy tooltip',
    });
  });

  it('returns 404 JSON when neither snapshot nor live issue exists', async () => {
    const issue = await resolveIssueDetailSource({
      findIssueSnapshot: () => Promise.resolve(null),
      getIssue: () => Promise.resolve(null),
      organizationId: 'org-1',
      validIssueKey: 'BT-404',
    });

    expect(issue).toBeInstanceOf(NextResponse);
    const response = issue as NextResponse;
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Issue not found' });
  });
});

describe('GET /api/issues/search JSON', () => {
  it('wraps Yandex search hits as { items: [{ key, summary, task }] }', () => {
    const providerIssue = normalizeYandexIssue(yandexIssue);
    expect(
      buildIssueSearchApiResponse([providerIssue], yandexMapIssueToTask(), null)
    ).toEqual({
      items: [
        {
          key: 'BT-100',
          summary: 'Fix occupancy tooltip',
          task: yandexIssueExpectedTask,
        },
      ],
    });
  });
});

describe('GET /api/issues/[issueKey]/transitions and batch JSON', () => {
  it('returns Yandex transition items as the route body', async () => {
    const get = vi.fn().mockResolvedValueOnce({ data: yandexTransitions });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ get } as never);
    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(client.getIssueTransitions('BT-100')).resolves.toEqual(yandexTransitions);
  });

  it('returns {} when the batch body has no issue keys', () => {
    expect(
      buildTransitionsBatchApiResponse([], { 'BT-100': yandexTransitions })
    ).toEqual({});
  });

  it('returns the provider map when issue keys are present', () => {
    expect(
      buildTransitionsBatchApiResponse(['BT-100'], { 'BT-100': yandexTransitions })
    ).toEqual({ 'BT-100': yandexTransitions });
  });
});

describe('GET /api/boards JSON', () => {
  it('maps organization teams to planner board items', () => {
    expect(
      mapTeamsToPlannerBoards([
        {
          slug: 'core',
          title: 'Core',
          tracker_board_id: '7',
          tracker_queue_key: 'BT',
        },
      ])
    ).toEqual([
      {
        id: 7,
        name: 'Core',
        queue: 'BT',
        team: 'core',
        teamTitle: 'Core',
      },
    ]);
  });
});
