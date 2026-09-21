import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveAssigneeProductUserId } from '@/lib/notifications/resolveAssigneeProductUserId';
import { getStaffByTrackerUserIdInOrg } from '@/lib/staffTeams/teamMembersQuery';

vi.mock('@/lib/staffTeams/teamMembersQuery', () => ({
  getStaffByTrackerUserIdInOrg: vi.fn(),
}));

describe('resolveAssigneeProductUserId', () => {
  beforeEach(() => {
    vi.mocked(getStaffByTrackerUserIdInOrg).mockReset();
  });

  it('returns staff uuid from staff: prefix', async () => {
    const result = await resolveAssigneeProductUserId('org-1', 'staff:abc-123');
    expect(result).toBe('abc-123');
    expect(getStaffByTrackerUserIdInOrg).not.toHaveBeenCalled();
  });

  it('resolves tracker uid via registry lookup', async () => {
    vi.mocked(getStaffByTrackerUserIdInOrg).mockResolvedValue({
      displayName: 'Ivan',
      trackerId: '8001',
      staffUid: 'user-uuid',
    });

    const result = await resolveAssigneeProductUserId('org-1', '8001');
    expect(result).toBe('user-uuid');
    expect(getStaffByTrackerUserIdInOrg).toHaveBeenCalledWith('org-1', '8001');
  });

  it('returns null for team swimlane ids', async () => {
    const result = await resolveAssigneeProductUserId('org-1', '__team__');
    expect(result).toBeNull();
  });
});
