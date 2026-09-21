import { beforeEach, describe, expect, it, vi } from 'vitest';

import { query } from '@/lib/db';

import { createOrgRole, listOrgRoles, updateOrgRole } from './orgRolesRepository';

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  pool: { connect: vi.fn() },
  qualifyBeerTrackerTables: (sql: string) => sql,
}));

const orgId = '11111111-1111-4111-8111-111111111111';

describe('orgRolesRepository', () => {
  beforeEach(() => {
    vi.mocked(query).mockReset();
  });

  it('listOrgRoles reads beer_tracker.org_roles', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never);
    await listOrgRoles(orgId);
    const [sql, params] = vi.mocked(query).mock.calls[0]!;
    expect(sql).toMatch(/FROM\s+org_roles/i);
    expect(sql).not.toMatch(/overseer/i);
    expect(params).toEqual([orgId]);
  });

  it('createOrgRole inserts into org_roles', async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          organization_id: orgId,
          slug: 'custom',
          title: 'Кастом',
          domain_role: 'tester',
          platforms: [],
          created_at: new Date('2024-01-01T00:00:00.000Z'),
          updated_at: new Date('2024-01-01T00:00:00.000Z'),
        },
      ],
    } as never);

    const row = await createOrgRole(orgId, {
      slug: 'Custom',
      title: 'Кастом',
      domainRole: 'tester',
      platforms: [],
    });
    expect(row?.slug).toBe('custom');
    expect(row?.domain_role).toBe('tester');

    const [sql, params] = vi.mocked(query).mock.calls[0]!;
    expect(sql).toMatch(/INSERT INTO org_roles/i);
    expect(sql).not.toMatch(/overseer/i);
    expect(params?.[0]).toBe(orgId);
    expect(params?.[1]).toBe('custom');
  });

  it('updateOrgRole updates org_roles', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never);
    await updateOrgRole(orgId, 'custom', { title: 'Новое' });
    const [sql] = vi.mocked(query).mock.calls[0]!;
    expect(sql).toMatch(/UPDATE org_roles/i);
    expect(sql).not.toMatch(/overseer/i);
  });
});
