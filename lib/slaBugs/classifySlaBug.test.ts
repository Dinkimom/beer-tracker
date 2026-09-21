import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import { classifySlaBug, classifyAndGroupSlaBugs } from './classifySlaBug';

const NOW = Date.parse('2026-06-18T12:00:00.000Z');
const FAR_SLA_DEADLINE = '2026-12-01T12:00:00.000Z';

function bug(partial: Partial<Task> & { id: string; incidentSeverity: string }): Task {
  return {
    id: partial.id,
    name: partial.name ?? partial.id,
    link: `https://tracker.yandex.ru/${partial.id}`,
    team: 'Back',
    type: 'bug',
    incidentSeverity: partial.incidentSeverity,
    storyPoints: partial.storyPoints,
    testPoints: partial.testPoints,
    originalStatus: partial.originalStatus ?? 'readyfordevelopment',
    createdAt: partial.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: partial.updatedAt,
    hdCount: partial.hdCount ?? 0,
    hdGrowth24h: partial.hdGrowth24h ?? 0,
    hdGrowth7d: partial.hdGrowth7d ?? 0,
    keyClient: partial.keyClient,
    supPriority: partial.supPriority,
    slaDeadline: partial.slaDeadline,
    lastHdAt: partial.lastHdAt,
    status: partial.status,
  };
}

describe('classifySlaBug', () => {
  it('P0 without tracker SLA computes deadline from createdAt + 1 day', () => {
    const result = classifySlaBug(
      bug({
        id: 'B-1',
        incidentSeverity: 'P0',
        createdAt: '2026-06-17T13:00:00.000Z',
      }),
      undefined,
      NOW
    );
    expect(result?.section).toBe('take_now');
    expect(result?.primaryLabel).toBe('save_sla');
  });

  it('P3 sharp 24h growth -> take_now + sharp_growth', () => {
    const result = classifySlaBug(
      bug({ id: 'B-2', incidentSeverity: 'P3', hdGrowth24h: 3, hdCount: 5 }),
      undefined,
      NOW
    );
    expect(result?.section).toBe('take_now');
    expect(result?.primaryLabel).toBe('sharp_growth');
  });

  it('P3 moderate 24h growth -> watch + growth_24h', () => {
    const result = classifySlaBug(
      bug({ id: 'B-3', incidentSeverity: 'P3', hdGrowth24h: 2, hdCount: 5 }),
      undefined,
      NOW
    );
    expect(result?.section).toBe('watch');
    expect(result?.primaryLabel).toBe('growth_24h');
  });

  it('P3 HD 19 without growth -> watch + close_to_upgrade', () => {
    const result = classifySlaBug(
      bug({
        id: 'B-4',
        incidentSeverity: 'P3',
        hdCount: 19,
        lastHdAt: '2026-06-10T12:00:00.000Z',
        slaDeadline: FAR_SLA_DEADLINE,
      }),
      undefined,
      NOW
    );
    expect(result?.section).toBe('watch');
    expect(result?.primaryLabel).toBe('close_to_upgrade');
  });

  it('P3 HD 19 with 7d growth 3 -> take_now + close_to_upgrade', () => {
    const result = classifySlaBug(
      bug({ id: 'B-5', incidentSeverity: 'P3', hdCount: 19, hdGrowth7d: 3 }),
      undefined,
      NOW
    );
    expect(result?.section).toBe('take_now');
    expect(['close_to_upgrade', 'sharp_growth', 'growth_24h']).toContain(result?.primaryLabel);
  });

  it('P3 near SLA with activity -> take_now + save_sla', () => {
    const result = classifySlaBug(
      bug({
        id: 'B-6',
        incidentSeverity: 'P3',
        hdCount: 4,
        slaDeadline: '2026-06-28T12:00:00.000Z',
        lastHdAt: '2026-06-10T12:00:00.000Z',
      }),
      undefined,
      NOW
    );
    expect(result?.section).toBe('take_now');
    expect(result?.primaryLabel).toBe('save_sla');
  });

  it('P3 near SLA without fresh activity -> review + demote low_relevance', () => {
    const result = classifySlaBug(
      bug({
        id: 'B-7',
        incidentSeverity: 'P3',
        hdCount: 2,
        slaDeadline: '2026-06-28T12:00:00.000Z',
        lastHdAt: '2026-04-01T12:00:00.000Z',
      }),
      undefined,
      NOW
    );
    expect(result?.section).toBe('review');
    expect(result?.primaryLabel).toBe('demote');
    expect(result?.demoteReason).toBe('low_relevance');
  });

  it('P3 stale_p3 -> review + demote', () => {
    const result = classifySlaBug(
      bug({
        id: 'B-7b',
        incidentSeverity: 'P3',
        hdCount: 10,
        createdAt: '2025-01-01T00:00:00.000Z',
        lastHdAt: '2025-02-01T12:00:00.000Z',
      }),
      undefined,
      NOW
    );
    expect(result?.section).toBe('review');
    expect(result?.primaryLabel).toBe('demote');
    expect(result?.demoteReason).toBe('stale_p3');
  });

  it('P3 in active work is not demoted', () => {
    const result = classifySlaBug(
      bug({
        id: 'B-7d',
        incidentSeverity: 'P3',
        hdCount: 2,
        status: 'in-progress',
        lastHdAt: '2026-04-01T12:00:00.000Z',
      }),
      undefined,
      NOW
    );
    expect(result?.section).not.toBe('review');
    expect(result?.primaryLabel).not.toBe('demote');
  });

  it('P3 with recent HD increase stays out of demote-by-stale rule', () => {
    const result = classifySlaBug(
      bug({
        id: 'B-7c',
        incidentSeverity: 'P3',
        hdCount: 5,
        lastHdAt: '2026-06-05T12:00:00.000Z',
        slaDeadline: '2026-12-01T12:00:00.000Z',
      }),
      undefined,
      NOW
    );
    expect(result?.primaryLabel).not.toBe('demote');
  });

  it('P4 key client HD 1 -> watch + key_client', () => {
    const result = classifySlaBug(
      bug({
        id: 'B-8',
        incidentSeverity: 'P4',
        hdCount: 1,
        keyClient: true,
        createdAt: '2026-06-01T00:00:00.000Z',
      }),
      undefined,
      NOW
    );
    expect(result?.section).toBe('watch');
    expect(result?.primaryLabel).toBe('key_client');
  });

  it('P4 old without growth -> regular + no_signal', () => {
    const result = classifySlaBug(
      bug({
        id: 'B-9',
        incidentSeverity: 'P4',
        hdCount: 3,
        createdAt: '2026-05-01T00:00:00.000Z',
      }),
      undefined,
      NOW
    );
    expect(result?.section).toBe('regular');
    expect(result?.primaryLabel).toBe('hd_low');
  });

  it('P4 older than 90 days -> review + close_p4', () => {
    const result = classifySlaBug(
      bug({
        id: 'B-10',
        incidentSeverity: 'P4',
        hdCount: 6,
        createdAt: '2026-02-01T00:00:00.000Z',
      }),
      undefined,
      NOW
    );
    expect(result?.section).toBe('review');
    expect(result?.primaryLabel).toBe('close_p4');
  });

  it('P4 key client HD 4 with 7d growth 2 -> take_now', () => {
    const result = classifySlaBug(
      bug({
        id: 'B-11',
        incidentSeverity: 'P4',
        hdCount: 4,
        hdGrowth7d: 2,
        keyClient: true,
        slaDeadline: FAR_SLA_DEADLINE,
      }),
      undefined,
      NOW
    );
    expect(result?.section).toBe('take_now');
    expect(result?.primaryLabel).toBe('close_to_upgrade');
  });
});

describe('classifyAndGroupSlaBugs', () => {
  it('groups bugs into sections', () => {
    const grouped = classifyAndGroupSlaBugs(
      [
        bug({ id: 'B-1', incidentSeverity: 'P1' }),
        bug({
          id: 'B-2',
          incidentSeverity: 'P3',
          hdGrowth24h: 2,
          hdCount: 5,
        }),
      ],
      undefined,
      NOW
    );
    expect(grouped.take_now).toHaveLength(1);
    expect(grouped.watch).toHaveLength(1);
    expect(grouped.regular).toHaveLength(0);
  });
});
