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
