import type { TrackerIssue } from '@/types/tracker';

import { describe, expect, it } from 'vitest';

import { parseSlaBugFieldsFromIssue, parseSlaPriority } from './parseSlaBugFields';

function issue(partial: Partial<TrackerIssue> & { key: string }): TrackerIssue {
  const { key, ...rest } = partial;
  return {
    id: rest.id ?? key,
    summary: rest.summary ?? key,
    self: rest.self ?? `https://tracker.yandex.ru/${key}`,
    key,
    ...rest,
  };
}

describe('parseSlaPriority', () => {
  it('parses P0–P4 and S-severity aliases', () => {
    expect(parseSlaPriority('P3')).toBe('P3');
    expect(parseSlaPriority('s1')).toBe('P0');
    expect(parseSlaPriority('S4')).toBe('P4');
    expect(parseSlaPriority('Критичность P1')).toBe('P1');
    expect(parseSlaPriority('')).toBeNull();
  });
});

describe('parseSlaBugFieldsFromIssue', () => {
  it('reads canonical Yandex field names from issue root', () => {
    const parsed = parseSlaBugFieldsFromIssue(
      issue({
        key: 'BUG-1',
        HD_count: 5,
        HD_growth24h: 2,
        HD_growth7d: 3,
        key_client: true,
        sup_priority: 'yes',
        slaDeadline: '2026-07-01T00:00:00.000Z',
        lastHDAt: '2026-06-10T12:00:00.000Z',
      })
    );
    expect(parsed).toMatchObject({
      hdCount: 5,
      hdGrowth24h: 2,
      hdGrowth7d: 3,
      keyClient: true,
      supPriority: true,
      slaDeadline: '2026-07-01T00:00:00.000Z',
      lastHdAt: '2026-06-10T12:00:00.000Z',
    });
  });

  it('reads aliases from customFields', () => {
    const parsed = parseSlaBugFieldsFromIssue({
      ...issue({ key: 'BUG-2' }),
      customFields: {
        hd_count: 8,
        hd_growth_24h: 1,
        hd_growth_7d: 4,
        keyClient: 'true',
        sla_date: '2026-08-01',
      },
    } as TrackerIssue & { customFields: Record<string, unknown> });
    expect(parsed.hdCount).toBe(8);
    expect(parsed.hdGrowth24h).toBe(1);
    expect(parsed.hdGrowth7d).toBe(4);
    expect(parsed.keyClient).toBe(true);
    expect(parsed.slaDeadline).toBe('2026-08-01');
  });

  it('detects key_client and sup_priority from tags', () => {
    const parsed = parseSlaBugFieldsFromIssue({
      ...issue({ key: 'BUG-3' }),
      tags: ['key_client', 'пуш_поддержки'],
    } as TrackerIssue & { tags: string[] });
    expect(parsed.keyClient).toBe(true);
    expect(parsed.supPriority).toBe(true);
  });

  it('uses configured field ids when provided', () => {
    const parsed = parseSlaBugFieldsFromIssue(
      issue({ key: 'BUG-4', orgHdCount: 11 } as TrackerIssue & { orgHdCount: number }),
      { hdCountFieldId: 'orgHdCount' }
    );
    expect(parsed.hdCount).toBe(11);
  });
});
