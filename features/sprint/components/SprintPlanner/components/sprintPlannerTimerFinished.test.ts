/** @vitest-environment jsdom */

import { afterEach, describe, expect, it } from 'vitest';

import {
  dismissSprintPlannerTimerFinished,
  isSprintPlannerTimerFinishedDismissed,
  shouldAutoOpenFinishedSprintPlannerTimer,
  sprintPlannerTimerDismissedStorageKey,
  sprintPlannerTimerFinishedStamp,
} from './sprintPlannerTimerFinished';

describe('sprintPlannerTimerFinished', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('builds a stamp only for a finished timer with duration', () => {
    expect(sprintPlannerTimerFinishedStamp('running', 60_000, 10)).toBe('');
    expect(sprintPlannerTimerFinishedStamp('finished', 0, 10)).toBe('');
    expect(sprintPlannerTimerFinishedStamp('finished', 60_000, 10)).toBe('10:60000');
  });

  it('does not auto-open a finished timer the user already dismissed', () => {
    expect(shouldAutoOpenFinishedSprintPlannerTimer('10:60000', '', false)).toBe(true);
    expect(shouldAutoOpenFinishedSprintPlannerTimer('10:60000', '10:60000', false)).toBe(false);
    expect(shouldAutoOpenFinishedSprintPlannerTimer('10:60000', '', true)).toBe(false);
    expect(shouldAutoOpenFinishedSprintPlannerTimer('', '', false)).toBe(false);
  });

  it('remembers a dismissed finished stamp per sprint across reloads', () => {
    const stamp = '10:60000';
    dismissSprintPlannerTimerFinished(7, stamp);

    expect(window.localStorage.getItem(sprintPlannerTimerDismissedStorageKey(7))).toBe(
      JSON.stringify(stamp)
    );
    expect(isSprintPlannerTimerFinishedDismissed(7, stamp)).toBe(true);
    expect(isSprintPlannerTimerFinishedDismissed(7, '11:60000')).toBe(false);
    expect(isSprintPlannerTimerFinishedDismissed(8, stamp)).toBe(false);
    expect(isSprintPlannerTimerFinishedDismissed(null, stamp)).toBe(false);
  });

  it('ignores empty dismiss writes', () => {
    dismissSprintPlannerTimerFinished(7, '');
    expect(window.localStorage.getItem(sprintPlannerTimerDismissedStorageKey(7))).toBeNull();
  });
});
