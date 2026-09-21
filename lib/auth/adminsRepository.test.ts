import { beforeEach, describe, expect, it, vi } from 'vitest';

import { query } from '@/lib/db';

import {
  countAdmins,
  deleteAdmin,
  insertAdmin,
  isStaffAdmin,
  resetAdminsTableEnsured,
} from './adminsRepository';

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
}));

vi.mock('@/lib/env', () => ({
  getBeerTrackerSchema: () => 'beer_tracker',
}));

describe('adminsRepository', () => {
  beforeEach(() => {
    vi.mocked(query).mockReset();
    vi.mocked(query).mockResolvedValue({ rows: [] } as never);
    resetAdminsTableEnsured();
  });

  it('isStaffAdmin is true when a row exists', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [{ one: 1 }] } as never);

    await expect(isStaffAdmin('11111111-1111-4111-8111-111111111111')).resolves.toBe(true);
    const selectCall = vi.mocked(query).mock.calls.find((call) =>
      String(call[0]).includes('FROM admins WHERE staff_uid')
    );
    expect(selectCall?.[1]).toEqual(['11111111-1111-4111-8111-111111111111']);
  });

  it('insertAdmin upserts by staff_uid', async () => {
    await insertAdmin('11111111-1111-4111-8111-111111111111');
    const insertCall = vi.mocked(query).mock.calls.find((call) =>
      String(call[0]).includes('INSERT INTO admins')
    );
    expect(String(insertCall?.[0])).toContain('ON CONFLICT (staff_uid) DO NOTHING');
    expect(insertCall?.[1]).toEqual(['11111111-1111-4111-8111-111111111111']);
  });

  it('deleteAdmin and countAdmins query admins table', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [{ count: '2' }] } as never);
    await deleteAdmin('11111111-1111-4111-8111-111111111111');
    await expect(countAdmins()).resolves.toBe(2);
    expect(
      vi.mocked(query).mock.calls.some((call) => String(call[0]).includes('DELETE FROM admins'))
    ).toBe(true);
  });
});
