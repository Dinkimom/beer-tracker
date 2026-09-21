import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiCache } from '@/lib/cache';
import { getIssueTrackerProviderKind } from '@/lib/env';

import { enrichPlannerTeamMembersAvatarsFromJira } from './enrichTeamMembersAvatarsFromJira';

vi.mock('@/lib/env', () => ({
  getIssueTrackerProviderKind: vi.fn(() => 'tracker'),
}));

vi.mock('@/lib/organizations', () => ({
  findOrganizationById: vi.fn(),
  getDecryptedOrganizationTrackerToken: vi.fn(),
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

vi.mock('@/lib/trackerRequestConfig', () => ({
  resolveTrackerApiBaseUrlForOrganizationRow: vi.fn(() => 'https://jira.example'),
}));

vi.mock('@/lib/issueTrackerProvider/settings', () => ({
  readIssueTrackerBasicAuthEmail: vi.fn(() => 'admin@example.com'),
}));

import { createIssueTrackerAxiosForCredentials } from '@/lib/issueTrackerProvider/createIssueTrackerAxios';
import { fetchJiraUserAvatarUrl } from '@/lib/issueTrackerProvider/jiraUserAvatar';
import { findOrganizationById, getDecryptedOrganizationTrackerToken } from '@/lib/organizations';
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
    vi.mocked(getIssueTrackerProviderKind).mockReturnValue('tracker');
  });

  it('skips Yandex Tracker provider', async () => {
    const members = [member({ uid: 'staff-1' })];
    await expect(
      enrichPlannerTeamMembersAvatarsFromJira('org-1', members)
    ).resolves.toBe(members);
    expect(findOrganizationById).not.toHaveBeenCalled();
  });

  it('fetches from Jira, writes staff, then uses cache gate', async () => {
    vi.mocked(getIssueTrackerProviderKind).mockReturnValue('jira-cloud');
    vi.mocked(findOrganizationById).mockResolvedValue({
      id: 'org-1',
      settings: {},
    } as never);
    vi.mocked(getDecryptedOrganizationTrackerToken).mockResolvedValue('token');
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

    const second = await enrichPlannerTeamMembersAvatarsFromJira('org-1', members);
    expect(second).toBe(members);
    expect(fetchJiraUserAvatarUrl).toHaveBeenCalledTimes(1);
  });
});
