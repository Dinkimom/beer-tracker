import { beforeEach, describe, expect, it, vi } from 'vitest';

import { query } from '@/lib/db';

import { findUserByEmail, findUserById } from './userRepository';

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
}));

describe('userRepository', () => {
  beforeEach(() => {
    vi.mocked(query).mockReset();
  });

  it('findUserById reads beer_tracker.staff by uuid', async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [{ created_at: new Date(), email: 'a@example.com', id: 'uid-1' }],
    } as never);

    const row = await findUserById('11111111-1111-4111-8111-111111111111');
    expect(row?.email).toBe('a@example.com');
    const [sql, params] = vi.mocked(query).mock.calls[0]!;
    expect(sql).toContain('FROM staff s');
    expect(sql).not.toMatch(/\bFROM\s+users\b/);
    expect(params).toEqual(['11111111-1111-4111-8111-111111111111']);
  });

  it('findUserById returns null when staff has no row', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never);

    const row = await findUserById('22222222-2222-4222-8222-222222222222');
    expect(row).toBeNull();
    expect(vi.mocked(query)).toHaveBeenCalledOnce();
    expect(String(vi.mocked(query).mock.calls[0]?.[0])).not.toMatch(/\busers\b/);
  });

  it('findUserByEmail reads staff', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never);
    await findUserByEmail('Ada@Example.com');
    const [sql, params] = vi.mocked(query).mock.calls[0]!;
    expect(sql).toContain('FROM staff s');
    expect(params).toEqual(['ada@example.com']);
  });
});
