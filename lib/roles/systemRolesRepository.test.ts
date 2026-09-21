import { beforeEach, describe, expect, it, vi } from 'vitest';

import { query } from '@/lib/db';

import { listSystemRoles, systemRoleSlugExists } from './systemRolesRepository';

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
}));

describe('systemRolesRepository', () => {
  beforeEach(() => {
    vi.mocked(query).mockReset();
  });

  it('listSystemRoles reads beer_tracker.system_roles', async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          slug: 'frontend',
          title: 'Фронтенд',
          domain_role: 'developer',
          platforms: ['web'],
          sort_order: 10,
          created_at: new Date('2024-01-01T00:00:00.000Z'),
          updated_at: new Date('2024-01-01T00:00:00.000Z'),
        },
      ],
    } as never);

    const rows = await listSystemRoles();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.slug).toBe('frontend');
    expect(rows[0]?.domain_role).toBe('developer');
    expect(rows[0]?.platforms).toEqual(['web']);

    const [sql] = vi.mocked(query).mock.calls[0]!;
    expect(sql).toMatch(/FROM\s+system_roles/i);
    expect(sql).not.toMatch(/overseer/i);
  });

  it('systemRoleSlugExists queries system_roles without overseer', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [{ one: 1 }] } as never);
    await expect(systemRoleSlugExists('frontend')).resolves.toBe(true);
    const [sql, params] = vi.mocked(query).mock.calls[0]!;
    expect(sql).toMatch(/FROM\s+system_roles/i);
    expect(sql).not.toMatch(/overseer/i);
    expect(params).toEqual(['frontend']);
  });
});
