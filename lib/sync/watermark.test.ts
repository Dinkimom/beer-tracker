import { describe, expect, it } from 'vitest';

import { computeIncrementalWindow } from './watermark';

describe('computeIncrementalWindow', () => {
  const until = new Date('2026-04-05T12:00:00.000Z');

  it('bootstrap without watermark uses interval + overlap', () => {
    const { since, until: u } = computeIncrementalWindow({
      now: until,
      intervalMinutes: 15,
      lastWatermarkUntil: null,
      overlapMinutes: 10,
    });
    expect(u.getTime()).toBe(until.getTime());
    expect(since.getTime()).toBe(
      until.getTime() - (15 + 10) * 60_000
    );
  });

  it('with watermark, since is watermark minus overlap', () => {
    const last = new Date('2026-04-05T11:30:00.000Z');
    const { since } = computeIncrementalWindow({
      now: until,
      intervalMinutes: 15,
      lastWatermarkUntil: last,
      overlapMinutes: 10,
    });
    expect(since.getTime()).toBe(last.getTime() - 10 * 60_000);
  });

  it('widens degenerate window when since >= until', () => {
    const last = new Date('2026-04-05T12:30:00.000Z');
    const { since } = computeIncrementalWindow({
      now: until,
      intervalMinutes: 15,
      lastWatermarkUntil: last,
      overlapMinutes: 10,
    });
    expect(since.getTime()).toBeLessThan(until.getTime());
    expect(since.getTime()).toBe(until.getTime() - 10 * 60_000 - 1000);
  });
});
