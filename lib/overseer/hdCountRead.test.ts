import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import { applyOverseerHdCountToTask } from './hdCountRead';

function task(partial: Partial<Task> & { id: string }): Task {
  return {
    id: partial.id,
    name: partial.name ?? partial.id,
    link: `https://tracker.yandex.ru/${partial.id}`,
    team: 'Back',
    type: 'bug',
    incidentSeverity: 'P3',
    hdCount: partial.hdCount,
    hdGrowth24h: partial.hdGrowth24h,
    hdGrowth7d: partial.hdGrowth7d,
    lastHdAt: partial.lastHdAt,
  };
}

describe('applyOverseerHdCountToTask', () => {
  it('overrides tracker HD fields when overseer snapshot exists', () => {
    const enriched = applyOverseerHdCountToTask(
      task({ id: 'SUP-16227', hdCount: 0, hdGrowth24h: 0, hdGrowth7d: 0 }),
      {
        hdCount: 4,
        hdGrowth24h: 1,
        hdGrowth7d: 2,
        lastHdAt: '2025-12-29T07:30:51.376Z',
      }
    );
    expect(enriched.hdCount).toBe(4);
    expect(enriched.hdGrowth24h).toBe(1);
    expect(enriched.hdGrowth7d).toBe(2);
    expect(enriched.lastHdAt).toBe('2025-12-29T07:30:51.376Z');
  });

  it('fills incident severity from overseer when tracker field is empty', () => {
    const enriched = applyOverseerHdCountToTask(
      { ...task({ id: 'SUP-16227', hdCount: 0 }), incidentSeverity: undefined },
      {
        hdCount: 4,
        hdGrowth24h: 0,
        hdGrowth7d: 0,
        incidentSeverity: 'P3',
      }
    );
    expect(enriched.incidentSeverity).toBe('P3');
    expect(enriched.hdCount).toBe(4);
  });

  it('uses createdAt as last HD increase when hd_count is 1', () => {
    const enriched = applyOverseerHdCountToTask(
      {
        ...task({ id: 'SUP-1', hdCount: 0 }),
        createdAt: '2026-06-01T08:30:00.000Z',
      },
      {
        hdCount: 1,
        hdGrowth24h: 0,
        hdGrowth7d: 0,
        lastHdAt: undefined,
      }
    );
    expect(enriched.hdCount).toBe(1);
    expect(enriched.lastHdAt).toBe('2026-06-01T08:30:00.000Z');
  });

  it('keeps task unchanged when snapshot is missing', () => {
    const original = task({ id: 'BUG-1', hdCount: 2 });
    expect(applyOverseerHdCountToTask(original, undefined)).toBe(original);
  });
});
