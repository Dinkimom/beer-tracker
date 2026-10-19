import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addRegistryTeamMemberFlow,
  addTrackerTeamMemberFlow,
} from './useAdminTeamDetailMembersAddHelpers';
import {
  postRegistryTeamMember,
  postTrackerTeamMember,
  refreshTeamMembers,
} from './useAdminTeamDetailMembersHelpers';

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('./useAdminTeamDetailMembersHelpers', () => ({
  postRegistryTeamMember: vi.fn(),
  postTrackerTeamMember: vi.fn(),
  refreshTeamMembers: vi.fn(),
}));

function baseResetters() {
  return {
    setAddRoleSlug: vi.fn(),
    setAddStaffMeta: vi.fn(),
    setAddStaffUid: vi.fn(),
    setAddTrackerMeta: vi.fn(),
    setAddTrackerUserId: vi.fn(),
    setMembers: vi.fn(),
  };
}

describe('add registry team member flow', () => {
  beforeEach(() => {
    vi.mocked(postRegistryTeamMember).mockReset();
    vi.mocked(postTrackerTeamMember).mockReset();
    vi.mocked(refreshTeamMembers).mockReset();
  });

  it('returns false when staff uid is empty', async () => {
    const ok = await addRegistryTeamMemberFlow({
      addRoleSlug: 'dev',
      addStaffUid: '',
      orgId: 'org',
      t: (key) => key,
      teamId: 'team',
      ...baseResetters(),
    });
    expect(ok).toBe(false);
  });

  it('posts tracker member and clears form on success', async () => {
    vi.mocked(postTrackerTeamMember).mockResolvedValue({ ok: true });
    vi.mocked(refreshTeamMembers).mockResolvedValue(undefined);
    const resetters = baseResetters();

    const ok = await addTrackerTeamMemberFlow({
      addRoleSlug: 'frontend',
      addTrackerMeta: { displayName: 'Ada', email: 'ada@example.com' },
      addTrackerUserId: 'tracker-1',
      orgId: 'org',
      t: (key) => key,
      teamId: 'team',
      ...resetters,
    });

    expect(ok).toBe(true);
    expect(postTrackerTeamMember).toHaveBeenCalledWith({
      addRoleSlug: 'frontend',
      displayName: 'Ada',
      email: 'ada@example.com',
      orgId: 'org',
      teamId: 'team',
      trackerUserId: 'tracker-1',
    });
    expect(resetters.setAddTrackerUserId).toHaveBeenCalledWith('');
    expect(resetters.setAddRoleSlug).toHaveBeenCalledWith('');
  });
});
