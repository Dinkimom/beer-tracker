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
  resolveTrackerApiBaseUrlForOrganizationRow: () => 'https://jira.example.com/rest/api/2',
}));

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
        { id: 'org-1', tracker_org_id: 'jira' },
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
      { id: 'org-2', tracker_org_id: 'jira' },
      issueTracker as never,
      { authFingerprint: 'token-2', ensureBoardId: 14684 }
    );
    expect(payload.boards).toEqual([
      { id: 14684, name: 'Rapid' },
      { id: 15116, name: 'Booking' },
    ]);
    expect(issueTracker.getBoard).toHaveBeenCalledWith(14684);
  });
});
