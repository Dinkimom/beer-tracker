import { describe, expect, it } from 'vitest';

import { fullRescanCooldownRemainingMs } from './fullRescanCooldown';

describe('fullRescanCooldownRemainingMs', () => {
  it('returns 0 when cooldown is disabled', () => {
    const last = new Date('2026-01-01T12:00:00.000Z');
    const now = new Date('2026-01-01T12:01:00.000Z');
    expect(
      fullRescanCooldownRemainingMs({
        cooldownMinutes: 0,
        lastFullRescanFinishedAt: last,
        now,
      })
    ).toBe(0);
  });

  it('returns 0 when no previous full rescan', () => {
    expect(
      fullRescanCooldownRemainingMs({
        cooldownMinutes: 60,
        lastFullRescanFinishedAt: null,
        now: new Date('2026-01-01T12:00:00.000Z'),
      })
    ).toBe(0);
  });

  it('returns positive ms until window ends', () => {
    const last = new Date('2026-01-01T12:00:00.000Z');
    const now = new Date('2026-01-01T12:30:00.000Z');
    expect(
      fullRescanCooldownRemainingMs({
        cooldownMinutes: 60,
        lastFullRescanFinishedAt: last,
        now,
      })
    ).toBe(30 * 60_000);
  });

  it('returns 0 after cooldown', () => {
    const last = new Date('2026-01-01T12:00:00.000Z');
    const now = new Date('2026-01-01T14:00:01.000Z');
    expect(
      fullRescanCooldownRemainingMs({
        cooldownMinutes: 60,
        lastFullRescanFinishedAt: last,
        now,
      })
    ).toBe(0);
  });
});
