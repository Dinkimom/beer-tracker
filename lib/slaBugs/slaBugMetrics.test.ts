import type { SlaBugInput } from './types';

import { describe, expect, it } from 'vitest';

import {
  computeSlaTimeMetrics,
  hasFreshActivity,
  matchesP4CloseReview,
  resolveEffectiveSlaDeadlineFromFields,
  resolveLastHdAt,
  resolveP3DemoteReason,
} from './slaBugMetrics';

describe('resolveEffectiveSlaDeadlineFromFields', () => {
  it('prefers tracker slaDeadline when present', () => {
    expect(
      resolveEffectiveSlaDeadlineFromFields('P3', '2026-01-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z')
    ).toBe('2026-07-01T00:00:00.000Z');
  });

  it('computes deadline from createdAt and priority resolution period', () => {
    expect(
      resolveEffectiveSlaDeadlineFromFields('P1', '2026-06-01T00:00:00.000Z', undefined)
    ).toBe('2026-06-08T00:00:00.000Z');
    expect(
      resolveEffectiveSlaDeadlineFromFields('P3', '2026-06-01T00:00:00.000Z', undefined)
    ).toBe('2026-07-16T00:00:00.000Z');
    expect(
      resolveEffectiveSlaDeadlineFromFields('P4', '2026-01-01T00:00:00.000Z', undefined)
    ).toBe('2026-06-30T00:00:00.000Z');
  });
});

describe('resolveLastHdAt', () => {
  it('uses createdAt when hd_count is 1', () => {
    expect(
      resolveLastHdAt(1, '2026-06-15T12:00:00.000Z', '2026-06-01T08:30:00.000Z')
    ).toBe('2026-06-01T08:30:00.000Z');
  });

  it('keeps lastHdAt when hd_count is greater than 1', () => {
    expect(
      resolveLastHdAt(2, '2026-06-15T12:00:00.000Z', '2026-06-01T08:30:00.000Z')
    ).toBe('2026-06-15T12:00:00.000Z');
  });

  it('falls back to lastHdAt when hd_count is 1 but createdAt is missing', () => {
    expect(resolveLastHdAt(1, '2026-06-15T12:00:00.000Z', undefined)).toBe(
      '2026-06-15T12:00:00.000Z'
    );
  });
});

describe('resolveP3DemoteReason', () => {
  const nowMs = Date.parse('2026-06-18T12:00:00.000Z');

  const baseInput: SlaBugInput = {
    id: 'BUG-1',
    priority: 'P3',
    createdAt: '2026-01-01T00:00:00.000Z',
    hdCount: 2,
    hdGrowth24h: 0,
    hdGrowth7d: 0,
    inActiveWork: false,
    keyClient: false,
    supPriority: false,
    lastHdAt: '2026-04-01T12:00:00.000Z',
  };

  it('returns low_relevance for stale low HD P3', () => {
    expect(resolveP3DemoteReason(baseInput, undefined, nowMs)).toBe('low_relevance');
  });

  it('returns stale_p3 for very old P3 without HD movement', () => {
    expect(
      resolveP3DemoteReason(
        {
          ...baseInput,
          createdAt: '2025-01-01T00:00:00.000Z',
          hdCount: 10,
          lastHdAt: '2025-02-01T12:00:00.000Z',
        },
        undefined,
        nowMs
      )
    ).toBe('stale_p3');
  });

  it('returns null when task is in active work', () => {
    expect(resolveP3DemoteReason({ ...baseInput, inActiveWork: true }, undefined, nowMs)).toBeNull();
  });

  it('returns null when hdCount is above low_relevance band and not stale_p3', () => {
    expect(
      resolveP3DemoteReason(
        {
          ...baseInput,
          hdCount: 5,
          lastHdAt: '2026-06-10T12:00:00.000Z',
        },
        undefined,
        nowMs
      )
    ).toBeNull();
  });

  it('returns null for hdCount 0', () => {
    expect(resolveP3DemoteReason({ ...baseInput, hdCount: 0 }, undefined, nowMs)).toBeNull();
  });

  it('returns null when hdCount is close to upgrade', () => {
    expect(
      resolveP3DemoteReason(
        {
          ...baseInput,
          hdCount: 19,
          createdAt: '2025-01-01T00:00:00.000Z',
          lastHdAt: '2025-02-01T12:00:00.000Z',
        },
        undefined,
        nowMs
      )
    ).toBeNull();
  });
});

describe('matchesP4CloseReview', () => {
  const nowMs = Date.parse('2026-06-18T12:00:00.000Z');

  it('matches old P4 without growth', () => {
    const input: SlaBugInput = {
      id: 'BUG-2',
      priority: 'P4',
      createdAt: '2026-02-01T00:00:00.000Z',
      hdCount: 6,
      hdGrowth24h: 0,
      hdGrowth7d: 0,
      inActiveWork: false,
      keyClient: false,
      supPriority: false,
    };
    const time = computeSlaTimeMetrics(input, nowMs);
    expect(matchesP4CloseReview(input, time)).toBe(true);
  });

  it('does not match when in active work', () => {
    const input: SlaBugInput = {
      id: 'BUG-3',
      priority: 'P4',
      createdAt: '2026-02-01T00:00:00.000Z',
      hdCount: 6,
      hdGrowth24h: 0,
      hdGrowth7d: 0,
      inActiveWork: true,
      keyClient: false,
      supPriority: false,
    };
    const time = computeSlaTimeMetrics(input, nowMs);
    expect(matchesP4CloseReview(input, time)).toBe(false);
  });
});

describe('hasFreshActivity with resolved lastHdAt', () => {
  const nowMs = Date.parse('2026-06-10T12:00:00.000Z');

  it('treats recent creation as fresh activity for hd_count 1', () => {
    const input: SlaBugInput = {
      id: 'BUG-1',
      priority: 'P3',
      createdAt: '2026-06-08T12:00:00.000Z',
      hdCount: 1,
      hdGrowth24h: 0,
      hdGrowth7d: 0,
      inActiveWork: false,
      keyClient: false,
      supPriority: false,
      lastHdAt: resolveLastHdAt(1, undefined, '2026-06-08T12:00:00.000Z'),
    };
    expect(hasFreshActivity(input, undefined, nowMs)).toBe(true);
  });
});
