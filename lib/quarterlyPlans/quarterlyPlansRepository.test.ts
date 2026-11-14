import { beforeEach, describe, expect, it, vi } from 'vitest';

import { query } from '@/lib/db';

import { fetchQuarterlyPlanContent, saveQuarterlyPlanContent } from './quarterlyPlansRepository';

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
}));

const Q4 = { quarter: 4, year: 2026 } as const;
const EMPTY = { assignments: [], directions: [], epics: [], links: [], notes: [] };

describe('quarterlyPlansRepository', () => {
  beforeEach(() => {
    vi.mocked(query).mockReset();
  });

  it('квартал без плана — пустой, версия 0', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never);
    await expect(fetchQuarterlyPlanContent('org-1', Q4)).resolves.toEqual({ content: EMPTY, version: 0 });
    const [sql, params] = vi.mocked(query).mock.calls[0]!;
    expect(sql).toMatch(/FROM org_quarterly_plans/);
    expect(params).toEqual(['org-1', 2026, 4]);
  });

  it('первое сохранение создаёт план; занятое место — конфликт', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rows: [{ version: 1 }] } as never);
    await expect(
      saveQuarterlyPlanContent({ content: EMPTY, ifVersion: 0, organizationId: 'org-1', ref: Q4 })
    ).resolves.toBe(1);
    expect(vi.mocked(query).mock.calls[0]![0]).toMatch(/INSERT INTO org_quarterly_plans[\s\S]*DO NOTHING/);

    vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never);
    await expect(
      saveQuarterlyPlanContent({ content: EMPTY, ifVersion: 0, organizationId: 'org-1', ref: Q4 })
    ).resolves.toBeNull();
  });

  it('следующее сохранение идёт только поверх ожидаемой версии (QS5)', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rows: [{ version: 4 }] } as never);
    await expect(
      saveQuarterlyPlanContent({ content: EMPTY, ifVersion: 3, organizationId: 'org-1', ref: Q4 })
    ).resolves.toBe(4);
    const [sql, params] = vi.mocked(query).mock.calls[0]!;
    expect(sql).toMatch(/version = version \+ 1[\s\S]*AND version = \$5/);
    expect(params).toEqual(['org-1', 2026, 4, JSON.stringify(EMPTY), 3]);

    vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never);
    await expect(
      saveQuarterlyPlanContent({ content: EMPTY, ifVersion: 3, organizationId: 'org-1', ref: Q4 })
    ).resolves.toBeNull();
  });
});
