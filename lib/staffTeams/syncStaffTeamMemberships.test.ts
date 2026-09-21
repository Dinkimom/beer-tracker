import { beforeEach, describe, expect, it, vi } from 'vitest';

import { findStaffById } from './staffRepository';
import { syncStaffTeamMemberships } from './syncStaffTeamMemberships';
import {
  addTeamMember,
  listTeamIdsForStaffInOrganization,
  removeTeamMember,
} from './teamMembersRepository';
import { findTeamById } from './teamsRepository';

vi.mock('./staffRepository', () => ({
  findStaffById: vi.fn(),
}));

vi.mock('./teamMembersRepository', () => ({
  addTeamMember: vi.fn(),
  listTeamIdsForStaffInOrganization: vi.fn(),
  removeTeamMember: vi.fn(),
}));

vi.mock('./teamsRepository', () => ({
  findTeamById: vi.fn(),
}));

describe('syncStaffTeamMemberships', () => {
  beforeEach(() => {
    vi.mocked(findStaffById).mockReset();
    vi.mocked(findTeamById).mockReset();
    vi.mocked(listTeamIdsForStaffInOrganization).mockReset();
    vi.mocked(addTeamMember).mockReset();
    vi.mocked(removeTeamMember).mockReset();
  });

  it('returns 404 when staff is missing', async () => {
    vi.mocked(findStaffById).mockResolvedValue(null);
    const result = await syncStaffTeamMemberships('org', 'staff', ['team-a']);
    expect(result).toEqual({ error: 'Сотрудник не найден', status: 404 });
  });

  it('adds missing teams and removes extras', async () => {
    vi.mocked(findStaffById).mockResolvedValue({ id: 'staff' } as never);
    vi.mocked(findTeamById).mockResolvedValue({ id: 'team-b' } as never);
    vi.mocked(listTeamIdsForStaffInOrganization).mockResolvedValue(['team-a']);
    vi.mocked(addTeamMember).mockResolvedValue({ team_id: 'team-b', staff_id: 'staff' } as never);
    vi.mocked(removeTeamMember).mockResolvedValue(true);

    const result = await syncStaffTeamMemberships('org', 'staff', ['team-b']);
    expect(result).toEqual({ ok: true });
    expect(removeTeamMember).toHaveBeenCalledWith('org', 'team-a', 'staff');
    expect(addTeamMember).toHaveBeenCalledWith('org', 'team-b', 'staff', null);
  });
});
