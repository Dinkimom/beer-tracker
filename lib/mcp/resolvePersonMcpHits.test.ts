import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadOrgTeamMemberRoleIndex } from '@/lib/sprints/sprintContextTeamMembers';
import { searchStaffInOrg } from '@/lib/staffTeams';

import { resolvePersonMcpHits } from './resolvePersonMcpHits';

vi.mock('@/lib/staffTeams', () => ({
  searchStaffInOrg: vi.fn(),
}));

vi.mock('@/lib/sprints/sprintContextTeamMembers', () => ({
  loadOrgTeamMemberRoleIndex: vi.fn(),
  lookupTeamMemberRole: (
    index: Map<string, { assigneeId: string }>,
    keys: Array<string | null | undefined>
  ) => {
    for (const key of keys) {
      const trimmed = key?.trim();
      if (trimmed && index.has(trimmed)) {
        return index.get(trimmed);
      }
    }
    return undefined;
  },
}));

const search = vi.mocked(searchStaffInOrg);
const loadRoles = vi.mocked(loadOrgTeamMemberRoleIndex);

describe('resolvePersonMcpHits', () => {
  beforeEach(() => {
    search.mockReset();
    loadRoles.mockReset();
  });

  it('attaches team role fields when the person is on a team', async () => {
    search.mockResolvedValue([
      {
        displayName: 'Ada Lovelace',
        email: 'ada@example.com',
        staffUid: '11111111-1111-4111-8111-111111111111',
        trackerId: 'tracker-ada',
      },
    ]);
    loadRoles.mockResolvedValue(
      new Map([
        [
          'tracker-ada',
          {
            assigneeId: 'tracker-ada',
            assigneeName: 'Ada Lovelace',
            platforms: ['web'],
            role: 'developer',
            roleTitle: 'Frontend',
            staffUid: '11111111-1111-4111-8111-111111111111',
          },
        ],
      ])
    );

    await expect(resolvePersonMcpHits('org-1', 'ada')).resolves.toEqual([
      {
        assigneeId: 'tracker-ada',
        displayName: 'Ada Lovelace',
        email: 'ada@example.com',
        platforms: ['web'],
        role: 'developer',
        roleTitle: 'Frontend',
        staffUid: '11111111-1111-4111-8111-111111111111',
        trackerId: 'tracker-ada',
        trackerLinked: true,
      },
    ]);
  });

  it('returns staff assignee without role or tracker id when not linked', async () => {
    search.mockResolvedValue([
      {
        displayName: 'Guest',
        staffUid: '22222222-2222-4222-8222-222222222222',
        trackerId: '22222222-2222-4222-8222-222222222222',
      },
    ]);
    loadRoles.mockResolvedValue(new Map());

    await expect(resolvePersonMcpHits('org-1', 'guest')).resolves.toEqual([
      {
        assigneeId: 'staff:22222222-2222-4222-8222-222222222222',
        displayName: 'Guest',
        email: null,
        staffUid: '22222222-2222-4222-8222-222222222222',
        trackerId: null,
        trackerLinked: false,
      },
    ]);
  });
});
