import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiCache } from '@/lib/cache';

import { loadTrackerCatalogResponse } from './adminTrackerCatalogHelpers';

vi.mock('@/lib/staffTeams', () => ({
  listTeams: vi.fn(() =>
    Promise.resolve([
      {
        id: 'team-1',
        title: 'Booking',
        tracker_board_id: 15116,
        tracker_queue_key: 'PROJ',
      },
    ])
  ),
}));

vi.mock('@/lib/trackerRequestConfig', () => ({
  requireOrganizationIssueTrackerConfig: () => ({
    apiUrl: 'https://jira.example.com/rest/api/2',
    kind: 'jira-onprem',
  }),
}));

const JIRA_SETTINGS = {
  issueTracker: { apiUrl: 'https://jira.example.com/rest/api/2', provider: 'jira-onprem' },
};

beforeEach(() => {
  apiCache.clear();
});

describe('loadTrackerCatalogResponse', () => {
  it('loads queues and boards from the provider client', async () => {
    const issueTracker = {
      getBoard: vi.fn(),
      listBoards: vi.fn(() => Promise.resolve([{ id: 15116, name: 'Booking' }])),
      listQueues: vi.fn(() => Promise.resolve([{ key: 'PROJ', name: 'Booking' }])),
    };

    await expect(
      loadTrackerCatalogResponse(
        'org-1',
        { id: 'org-1', settings: JIRA_SETTINGS, tracker_org_id: 'jira' },
        issueTracker as never,
        { authFingerprint: 'token-1' }
      )
    ).resolves.toEqual({
      boards: [{ id: 15116, name: 'Booking' }],
      queues: [{ key: 'PROJ', name: 'Booking' }],
      teams: [
        {
          id: 'team-1',
          title: 'Booking',
          tracker_board_id: 15116,
          tracker_queue_key: 'PROJ',
        },
      ],
    });
    expect(issueTracker.getBoard).not.toHaveBeenCalled();
  });

  it('fetches a missing board by id and merges it into the catalog', async () => {
    const issueTracker = {
      getBoard: vi.fn(() => Promise.resolve({ id: 14684, name: 'Rapid' })),
      listBoards: vi.fn(() => Promise.resolve([{ id: 15116, name: 'Booking' }])),
      listQueues: vi.fn(() => Promise.resolve([])),
    };

    const payload = await loadTrackerCatalogResponse(
      'org-2',
      { id: 'org-2', settings: JIRA_SETTINGS, tracker_org_id: 'jira' },
      issueTracker as never,
      { authFingerprint: 'token-2', ensureBoardId: 14684 }
    );
    expect(payload.boards).toEqual([
      { id: 14684, name: 'Rapid' },
      { id: 15116, name: 'Booking' },
    ]);
    expect(issueTracker.getBoard).toHaveBeenCalledWith(14684);
  });

  it('serves queues and boards from cache until forceRefresh', async () => {
    const issueTracker = {
      getBoard: vi.fn(),
      listBoards: vi.fn(() => Promise.resolve([{ id: 1, name: 'A' }])),
      listQueues: vi.fn(() => Promise.resolve([{ key: 'A', name: 'A' }])),
    };

    await loadTrackerCatalogResponse(
      'org-cache',
      { id: 'org-cache', settings: JIRA_SETTINGS, tracker_org_id: 'jira' },
      issueTracker as never,
      { authFingerprint: 'token-cache' }
    );
    await loadTrackerCatalogResponse(
      'org-cache',
      { id: 'org-cache', settings: JIRA_SETTINGS, tracker_org_id: 'jira' },
      issueTracker as never,
      { authFingerprint: 'token-cache' }
    );
    expect(issueTracker.listQueues).toHaveBeenCalledTimes(1);

    issueTracker.listQueues.mockClear();
    issueTracker.listBoards.mockClear();
    issueTracker.listQueues.mockImplementation(() =>
      Promise.resolve([{ key: 'B', name: 'B' }])
    );
    issueTracker.listBoards.mockImplementation(() =>
      Promise.resolve([{ id: 2, name: 'B' }])
    );

    const refreshed = await loadTrackerCatalogResponse(
      'org-cache',
      { id: 'org-cache', settings: JIRA_SETTINGS, tracker_org_id: 'jira' },
      issueTracker as never,
      { authFingerprint: 'token-cache', forceRefresh: true }
    );
    expect(issueTracker.listQueues).toHaveBeenCalledTimes(1);
    expect(refreshed.queues).toEqual([{ key: 'B', name: 'B' }]);
    expect(refreshed.boards).toEqual([{ id: 2, name: 'B' }]);
  });
});
