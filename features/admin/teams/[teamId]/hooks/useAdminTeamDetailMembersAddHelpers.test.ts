import { describe, expect, it, vi } from 'vitest';

import { addRegistryTeamMemberFlow } from './useAdminTeamDetailMembersAddHelpers';

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('./useAdminTeamDetailMembersHelpers', () => ({
  postRegistryTeamMember: vi.fn(),
  refreshTeamMembers: vi.fn(),
}));

describe('add registry team member flow', () => {
  it('returns false when staff uid is empty', async () => {
    const ok = await addRegistryTeamMemberFlow({
      addRoleSlug: 'dev',
      addStaffUid: '',
      orgId: 'org',
      setAddRoleSlug: vi.fn(),
      setAddStaffMeta: vi.fn(),
      setAddStaffUid: vi.fn(),
      setMembers: vi.fn(),
      t: (key) => key,
      teamId: 'team',
    });
    expect(ok).toBe(false);
  });
});
