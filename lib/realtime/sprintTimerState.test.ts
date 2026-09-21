import { describe, expect, it } from 'vitest';

import {
  applySprintTimerAction,
  clampSprintTimerDurationMs,
  formatSprintTimerClock,
  formatSprintTimerClockSpaced,
  idleSprintTimerState,
  parseSprintTimerState,
  remainingMsAt,
  SPRINT_TIMER_MAX_MS,
  SPRINT_TIMER_MIN_MS,
  sprintTimerStatusAt,
} from './sprintTimerState';

const actor = { displayName: 'Ada', userId: 'user-a' };

describe('sprintTimerState', () => {
  it('formats a countdown clock with minutes and seconds', () => {
    expect(formatSprintTimerClock(0)).toBe('00:00');
    expect(formatSprintTimerClock(1_000)).toBe('00:01');
    expect(formatSprintTimerClock(61_000)).toBe('01:01');
    expect(formatSprintTimerClock(5 * 60_000)).toBe('05:00');
    expect(formatSprintTimerClockSpaced(5 * 60_000)).toBe('05 : 00');
  });

  it('clamps duration to the allowed range', () => {
    expect(clampSprintTimerDurationMs(0)).toBe(SPRINT_TIMER_MIN_MS);
    expect(clampSprintTimerDurationMs(SPRINT_TIMER_MAX_MS + 1)).toBe(SPRINT_TIMER_MAX_MS);
  });

  it('starts, pauses, resumes and stops a shared countdown', () => {
    const now = 1_000_000;
    const running = applySprintTimerAction(idleSprintTimerState(now), { action: 'start', durationMs: 60_000 }, now, actor);
    expect(running.status).toBe('running');
    expect(running.endsAt).toBe(now + 60_000);
    expect(remainingMsAt(running, now + 10_000)).toBe(50_000);

    const paused = applySprintTimerAction(running, { action: 'pause' }, now + 10_000, actor);
    expect(paused.status).toBe('paused');
    expect(paused.remainingMs).toBe(50_000);
    expect(remainingMsAt(paused, now + 40_000)).toBe(50_000);

    const resumed = applySprintTimerAction(paused, { action: 'resume' }, now + 40_000, actor);
    expect(resumed.status).toBe('running');
    expect(resumed.endsAt).toBe(now + 90_000);

    const stopped = applySprintTimerAction(resumed, { action: 'stop' }, now + 41_000, actor);
    expect(stopped.status).toBe('idle');
    expect(stopped.remainingMs).toBe(0);
  });

  it('marks a running timer finished when the end time has passed', () => {
    const now = 5_000;
    const running = applySprintTimerAction(idleSprintTimerState(now), { action: 'start', durationMs: 1_000 }, now, actor);
    expect(sprintTimerStatusAt(running, now + 1_000)).toBe('finished');
    expect(remainingMsAt(running, now + 1_000)).toBe(0);
  });

  it('adds a minute to a running timer and caps at the maximum', () => {
    const now = 2_000;
    const running = applySprintTimerAction(idleSprintTimerState(now), { action: 'start', durationMs: 5_000 }, now, actor);
    const extended = applySprintTimerAction(running, { action: 'add', extraMs: 60_000 }, now + 1_000, actor);
    expect(extended.remainingMs).toBe(64_000);
    const capped = applySprintTimerAction(extended, { action: 'add', extraMs: SPRINT_TIMER_MAX_MS }, now + 1_000, actor);
    expect(capped.remainingMs).toBe(SPRINT_TIMER_MAX_MS);
  });

  it('subtracts a minute and stops when nothing remains', () => {
    const now = 3_000;
    const running = applySprintTimerAction(
      idleSprintTimerState(now),
      { action: 'start', durationMs: 90_000 },
      now,
      actor
    );
    const reduced = applySprintTimerAction(running, { action: 'add', extraMs: -60_000 }, now, actor);
    expect(reduced.status).toBe('running');
    expect(reduced.remainingMs).toBe(30_000);
    const stopped = applySprintTimerAction(reduced, { action: 'add', extraMs: -60_000 }, now, actor);
    expect(stopped.status).toBe('idle');
  });

  it('parses a valid snapshot and rejects a corrupt one', () => {
    const now = 9_000;
    const running = applySprintTimerAction(idleSprintTimerState(now), { action: 'start', durationMs: 3_000 }, now, actor);
    expect(parseSprintTimerState(running)).toEqual(running);
    expect(parseSprintTimerState({ ...running, status: 'nope' })).toBeNull();
    expect(parseSprintTimerState({ ...running, updatedBy: { userId: 'u' } })).toBeNull();
  });
});
