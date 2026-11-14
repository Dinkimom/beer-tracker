import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AddTrackerTeamMemberError } from '@/lib/onPrem/addTrackerPersonErrors';
import { addTrackerPersonToTeamWithProductUser } from '@/lib/onPrem/addTrackerPersonToTeamWithProductUser';

import { applyTeamCompositionOps } from './teamCompositionOps';
import { addOrgStaffToTeam, removeTeamMember, updateTeamMemberRole } from './teamMembersRepository';
import { findTeamById } from './teamsRepository';

vi.mock('@/lib/onPrem/addTrackerPersonToTeamWithProductUser', () => ({
  addTrackerPersonToTeamWithProductUser: vi.fn(),
}));
vi.mock('@/lib/roles/systemRolesRepository', () => ({
  listSystemRoles: vi.fn().mockResolvedValue([{ slug: 'developer', title: 'Developer' }]),
}));
vi.mock('@/lib/roles/orgRolesRepository', () => ({ listOrgRoles: vi.fn().mockResolvedValue([]) }));
vi.mock('@/lib/roles/effectiveCatalog', () => ({
  getEffectiveRoles: (system: Array<{ slug: string; title: string }>) => system,
}));
vi.mock('./teamMembersRepository', () => ({
  addOrgStaffToTeam: vi.fn(),
  listTeamMembersWithStaff: vi.fn(),
  removeTeamMember: vi.fn(),
  updateTeamMemberRole: vi.fn(),
}));
vi.mock('./teamsRepository', () => ({ findTeamById: vi.fn(), listTeams: vi.fn() }));

const TEAM = '11111111-1111-4111-8111-111111111111';
const STAFF = '22222222-2222-4222-8222-222222222222';

function run(ops: Parameters<typeof applyTeamCompositionOps>[0]['ops']) {
  return applyTeamCompositionOps({ ops, organizationId: 'org-1' });
}

describe('applyTeamCompositionOps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findTeamById).mockImplementation((_org, id) => Promise.resolve(id === TEAM ? ({ id } as never) : null));
  });

  it('добавляет человека организации и человека из трекера', async () => {
    vi.mocked(addOrgStaffToTeam).mockResolvedValue({ role_slug: 'developer', staff_id: STAFF, team_id: TEAM });
    vi.mocked(addTrackerPersonToTeamWithProductUser).mockResolvedValue({
      member: { role_slug: null, staff_id: 'staff-new', team_id: TEAM },
    });
    await expect(
      run([
        { op: 'addMember', roleSlug: 'developer', staffId: STAFF, teamId: TEAM },
        { email: 'adilet@example.com', op: 'addMember', teamId: TEAM, trackerUserId: 'jira-42' },
      ])
    ).resolves.toEqual({
      applied: [
        { op: 'addMember', staffId: STAFF, teamId: TEAM },
        { op: 'addMember', staffId: 'staff-new', teamId: TEAM },
      ],
      ok: true,
    });
    expect(addTrackerPersonToTeamWithProductUser).toHaveBeenCalledWith(
      expect.objectContaining({ emailStr: 'adilet@example.com', organizationId: 'org-1', trackerUserId: 'jira-42' })
    );
  });

  it('проверяет способ добавления, команду и роль до записи', async () => {
    await expect(run([{ op: 'addMember', teamId: TEAM }])).resolves.toMatchObject({
      error: 'addMember: addMember needs exactly one of staffId or trackerUserId',
    });
    await expect(run([{ op: 'setRole', roleSlug: 'astronaut', staffId: STAFF, teamId: TEAM }])).resolves.toMatchObject({
      error: 'setRole: unknown role astronaut',
    });
    const otherTeam = '33333333-3333-4333-8333-333333333333';
    await expect(run([{ op: 'removeMember', staffId: STAFF, teamId: otherTeam }])).resolves.toMatchObject({
      error: `removeMember: unknown team ${otherTeam}`,
    });
    expect(removeTeamMember).not.toHaveBeenCalled();
  });

  it('останавливается на первой ошибке, сделанное до неё остаётся', async () => {
    vi.mocked(updateTeamMemberRole).mockResolvedValue({ role_slug: null, staff_id: STAFF, team_id: TEAM });
    vi.mocked(removeTeamMember).mockResolvedValue(false);
    const result = await run([
      { op: 'setRole', roleSlug: null, staffId: STAFF, teamId: TEAM },
      { op: 'removeMember', staffId: STAFF, teamId: TEAM },
      { op: 'setRole', roleSlug: 'developer', staffId: STAFF, teamId: TEAM },
    ]);
    expect(result).toEqual({
      applied: [{ op: 'setRole', staffId: STAFF, teamId: TEAM }],
      error: 'removeMember: the person is not in this team',
      ok: false,
      opIndex: 1,
    });
    expect(updateTeamMemberRole).toHaveBeenCalledTimes(1);
  });

  it('ошибка добавления из трекера приходит текстом, а не исключением', async () => {
    vi.mocked(addTrackerPersonToTeamWithProductUser).mockRejectedValue(
      new AddTrackerTeamMemberError('Не удалось добавить: команда или сотрудник не найдены', 404)
    );
    await expect(run([{ op: 'addMember', teamId: TEAM, trackerUserId: 'jira-1' }])).resolves.toMatchObject({
      error: 'addMember: Не удалось добавить: команда или сотрудник не найдены',
      ok: false,
    });
  });
});
