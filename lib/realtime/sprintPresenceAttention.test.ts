import { describe, expect, it } from 'vitest';

import {
  isSprintPresenceAttention,
  isSprintPresenceViewerIdle,
  mergeSprintPresenceAttention,
  resolveSprintPresenceAttention,
  SPRINT_PRESENCE_IDLE_AFTER_MS,
} from './sprintPresenceAttention';

describe('sprintPresenceAttention', () => {
  it('accepts known attention values', () => {
    expect(isSprintPresenceAttention('active')).toBe(true);
    expect(isSprintPresenceAttention('idle')).toBe(true);
    expect(isSprintPresenceAttention('away')).toBe(false);
  });

  it('treats missing attention as not idle', () => {
    expect(isSprintPresenceViewerIdle(undefined)).toBe(false);
    expect(isSprintPresenceViewerIdle('active')).toBe(false);
    expect(isSprintPresenceViewerIdle('idle')).toBe(true);
  });

  it('marks a hidden tab idle even with recent activity', () => {
    expect(
      resolveSprintPresenceAttention({
        hasFocus: true,
        lastActivityAt: Date.now(),
        now: Date.now(),
        visibilityState: 'hidden',
      })
    ).toBe('idle');
  });

  it('stays active while focused on a card', () => {
    const now = 1_000_000;
    expect(
      resolveSprintPresenceAttention({
        hasFocus: true,
        lastActivityAt: now - SPRINT_PRESENCE_IDLE_AFTER_MS - 1,
        now,
        visibilityState: 'visible',
      })
    ).toBe('active');
  });

  it('goes idle after inactivity on a visible tab', () => {
    const now = 1_000_000;
    expect(
      resolveSprintPresenceAttention({
        hasFocus: false,
        lastActivityAt: now - SPRINT_PRESENCE_IDLE_AFTER_MS,
        now,
        visibilityState: 'visible',
      })
    ).toBe('idle');
    expect(
      resolveSprintPresenceAttention({
        hasFocus: false,
        lastActivityAt: now - SPRINT_PRESENCE_IDLE_AFTER_MS + 1,
        now,
        visibilityState: 'visible',
      })
    ).toBe('active');
  });

  it('prefers active when merging tabs', () => {
    expect(mergeSprintPresenceAttention('idle', 'idle')).toBe('idle');
    expect(mergeSprintPresenceAttention('idle', 'active')).toBe('active');
    expect(mergeSprintPresenceAttention(undefined, 'idle')).toBe('active');
  });
});
