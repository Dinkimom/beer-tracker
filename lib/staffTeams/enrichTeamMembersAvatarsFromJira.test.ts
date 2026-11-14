import type * as OrganizationTrackerCredentialsModule from '@/lib/organizations/organizationTrackerCredentials';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiCache } from '@/lib/cache';

import { enrichPlannerTeamMembersAvatarsFromJira } from './enrichTeamMembersAvatarsFromJira';

vi.mock('@/lib/organizations', () => ({
  findOrganizationById: vi.fn(),
}));

vi.mock('@/lib/organizations/organizationTrackerCredentials', async (importOriginal) => ({
  ...(await importOriginal<typeof OrganizationTrackerCredentialsModule>()),
  getOrganizationTrackerCredentials: vi.fn(),
}));

vi.mock('@/lib/issueTrackerProvider/createIssueTrackerAxios', () => ({
  createIssueTrackerAxiosForCredentials: vi.fn(),
}));

vi.mock('@/lib/issueTrackerProvider/jiraUserAvatar', () => ({
  fetchJiraUserAvatarUrl: vi.fn(),
}));

vi.mock('@/lib/staffTeams/staffRepository', () => ({
  updateStaff: vi.fn(),
}));

import { createIssueTrackerAxiosForCredentials } from '@/lib/issueTrackerProvider/createIssueTrackerAxios';
import { fetchJiraUserAvatarUrl } from '@/lib/issueTrackerProvider/jiraUserAvatar';
import { findOrganizationById } from '@/lib/organizations';
import { getOrganizationTrackerCredentials } from '@/lib/organizations/organizationTrackerCredentials';
import { updateStaff } from '@/lib/staffTeams/staffRepository';

function member(partial: {
  avatarUrl?: string | null;
  tracker_uid?: string | null;
  uid: string;
}) {
  return {
    active: true,
    avatarUrl: partial.avatarUrl ?? null,
    displayName: 'Ada',
    firstName: 'Ada',
    lastName: '',
    login: 'ada',
    team: { board: 1, queue: 'Q', slug: 't', title: 'Team', uid: 'team-1' },
    tracker_uid: partial.tracker_uid ?? 'acc-1',
    uid: partial.uid,
  };
}

function mockJiraCloudOrg() {
  vi.mocked(findOrganizationById).mockResolvedValue({
    id: 'org-1',
    settings: {
      issueTracker: { apiUrl: 'https://jira.example/rest/api/3', provider: 'jira-cloud' },
    },
  } as never);
  vi.mocked(getOrganizationTrackerCredentials).mockResolvedValue({
    accessToken: 'token',
    atlassianOAuth: false,
  });
  vi.mocked(createIssueTrackerAxiosForCredentials).mockReturnValue({ get: vi.fn() } as never);
  vi.mocked(updateStaff).mockResolvedValue({} as never);
}

describe('enrichPlannerTeamMembersAvatarsFromJira', () => {
  beforeEach(() => {
    apiCache.clear();
    vi.clearAllMocks();
  });

  it('skips Yandex Tracker organizations and caches the decision', async () => {
    vi.mocked(findOrganizationById).mockResolvedValue({
      id: 'org-1',
      settings: { issueTracker: { provider: 'tracker' } },
    } as never);
    const members = [member({ uid: 'staff-1' })];
    await expect(
      enrichPlannerTeamMembersAvatarsFromJira('org-1', members)
    ).resolves.toBe(members);
    await enrichPlannerTeamMembersAvatarsFromJira('org-1', members);
    expect(findOrganizationById).toHaveBeenCalledTimes(1);
    expect(getOrganizationTrackerCredentials).not.toHaveBeenCalled();
  });

  it('fetches from Jira, writes staff, then uses cache gate', async () => {
    vi.mocked(findOrganizationById).mockResolvedValue({
      id: 'org-1',
      settings: {
        issueTracker: {
          apiUrl: 'https://jira.example/rest/api/3',
          basicAuthEmail: 'ada@example.com',
          provider: 'jira-cloud',
        },
      },
    } as never);
    vi.mocked(getOrganizationTrackerCredentials).mockResolvedValue({
      accessToken: 'token',
      atlassianOAuth: false,
    });
    vi.mocked(createIssueTrackerAxiosForCredentials).mockReturnValue({ get: vi.fn() } as never);
    vi.mocked(fetchJiraUserAvatarUrl).mockResolvedValue('https://cdn.example/a.png');
    vi.mocked(updateStaff).mockResolvedValue({} as never);

    const members = [member({ uid: 'staff-1', avatarUrl: null })];
    const first = await enrichPlannerTeamMembersAvatarsFromJira('org-1', members);
    expect(first[0]?.avatarUrl).toBe('https://cdn.example/a.png');
    expect(updateStaff).toHaveBeenCalledWith('org-1', 'staff-1', {
      avatar_url: 'https://cdn.example/a.png',
    });
    expect(fetchJiraUserAvatarUrl).toHaveBeenCalledTimes(1);
    expect(createIssueTrackerAxiosForCredentials).toHaveBeenCalledWith(
      expect.objectContaining({
        apiUrl: 'https://jira.example/rest/api/3',
        jiraEmail: 'ada@example.com',
        providerKind: 'jira-cloud',
      })
    );

    const second = await enrichPlannerTeamMembersAvatarsFromJira('org-1', members);
    expect(second).toBe(members);
    expect(fetchJiraUserAvatarUrl).toHaveBeenCalledTimes(1);
  });

  it('checks a newly added member right away, without waiting for the TTL', async () => {
    mockJiraCloudOrg();
    vi.mocked(fetchJiraUserAvatarUrl).mockImplementation((_api, trackerId) =>
      Promise.resolve(`https://cdn.example/${trackerId}.png`)
    );

    await enrichPlannerTeamMembersAvatarsFromJira('org-1', [member({ uid: 'staff-1' })]);
    const result = await enrichPlannerTeamMembersAvatarsFromJira('org-1', [
      member({ uid: 'staff-1', avatarUrl: 'https://cdn.example/acc-1.png' }),
      member({ uid: 'staff-2', tracker_uid: 'acc-2' }),
    ]);

    expect(fetchJiraUserAvatarUrl).toHaveBeenCalledTimes(2);
    expect(result[1]?.avatarUrl).toBe('https://cdn.example/acc-2.png');
    expect(updateStaff).toHaveBeenLastCalledWith('org-1', 'staff-2', {
      avatar_url: 'https://cdn.example/acc-2.png',
    });
  });

  it('rechecks after the TTL and writes a changed avatar', async () => {
    vi.useFakeTimers();
    try {
      mockJiraCloudOrg();
      vi.mocked(fetchJiraUserAvatarUrl).mockResolvedValueOnce('https://cdn.example/old.png');
      await enrichPlannerTeamMembersAvatarsFromJira('org-1', [member({ uid: 'staff-1' })]);

      vi.advanceTimersByTime(31 * 60 * 1000);
      vi.mocked(fetchJiraUserAvatarUrl).mockResolvedValueOnce('https://cdn.example/new.png');
      const result = await enrichPlannerTeamMembersAvatarsFromJira('org-1', [
        member({ uid: 'staff-1', avatarUrl: 'https://cdn.example/old.png' }),
      ]);

      expect(result[0]?.avatarUrl).toBe('https://cdn.example/new.png');
      expect(updateStaff).toHaveBeenLastCalledWith('org-1', 'staff-1', {
        avatar_url: 'https://cdn.example/new.png',
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('answers without waiting for slow Jira and still writes staff in background', async () => {
    vi.useFakeTimers();
    try {
      mockJiraCloudOrg();
      vi.mocked(fetchJiraUserAvatarUrl).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve('https://cdn.example/slow.png'), 10_000);
          })
      );
      const members = [member({ uid: 'staff-1' })];
      const pending = enrichPlannerTeamMembersAvatarsFromJira('org-1', members);
      await vi.advanceTimersByTimeAsync(3000);
      await expect(pending).resolves.toEqual(members);
      expect(updateStaff).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(10_000);
      expect(updateStaff).toHaveBeenCalledWith('org-1', 'staff-1', {
        avatar_url: 'https://cdn.example/slow.png',
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses the Atlassian OAuth gateway for an org-stored OAuth pair', async () => {
    vi.mocked(findOrganizationById).mockResolvedValue({
      id: 'org-1',
      settings: {
        issueTracker: {
          apiUrl: 'https://acme.atlassian.net/rest/api/3',
          cloudId: 'cloud-1',
          provider: 'jira-cloud',
        },
      },
    } as never);
    vi.mocked(getOrganizationTrackerCredentials).mockResolvedValue({
      accessToken: 'oauth-access',
      atlassianOAuth: true,
    });
    vi.mocked(createIssueTrackerAxiosForCredentials).mockReturnValue({ get: vi.fn() } as never);
    vi.mocked(fetchJiraUserAvatarUrl).mockResolvedValue('https://cdn.example/a.png');
    vi.mocked(updateStaff).mockResolvedValue({} as never);

    await enrichPlannerTeamMembersAvatarsFromJira('org-1', [member({ uid: 'staff-1' })]);

    expect(createIssueTrackerAxiosForCredentials).toHaveBeenCalledWith(
      expect.objectContaining({
        apiUrl: 'https://api.atlassian.com/ex/jira/cloud-1/rest/api/3',
        jiraEmail: '',
        oauthToken: 'oauth-access',
      })
    );
  });
});
