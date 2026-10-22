import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearTaskStatusTransition,
  getTaskStatusTransitionSnapshot,
  markTaskStatusTransitionPending,
  settleTaskStatusTransition,
  subscribeTaskStatusTransition,
  TASK_STATUS_TRANSITION_APPLIED_MS,
  TASK_STATUS_TRANSITION_FAILED_MS,
  taskStatusTransitionClassName,
} from './taskStatusTransitionFeedback';

describe('taskStatusTransitionFeedback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    clearTaskStatusTransition('T-1');
    vi.useRealTimers();
  });

  it('pending → applied, then idle after the highlight', () => {
    markTaskStatusTransitionPending('T-1');
    expect(getTaskStatusTransitionSnapshot().get('T-1')).toBe('pending');

    settleTaskStatusTransition('T-1', 'applied');
    expect(getTaskStatusTransitionSnapshot().get('T-1')).toBe('applied');

    vi.advanceTimersByTime(TASK_STATUS_TRANSITION_APPLIED_MS);
    expect(getTaskStatusTransitionSnapshot().has('T-1')).toBe(false);
  });

  it('a new transition during the failure shake is not cleared by the old timer', () => {
    settleTaskStatusTransition('T-1', 'failed');
    markTaskStatusTransitionPending('T-1');

    vi.advanceTimersByTime(TASK_STATUS_TRANSITION_FAILED_MS);
    expect(getTaskStatusTransitionSnapshot().get('T-1')).toBe('pending');
  });

  it('notifies subscribers only on real changes', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeTaskStatusTransition(listener);

    markTaskStatusTransitionPending('T-1');
    markTaskStatusTransitionPending('T-1');
    clearTaskStatusTransition('T-1');
    clearTaskStatusTransition('T-1');
    unsubscribe();

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('builds the phase class name', () => {
    expect(taskStatusTransitionClassName(undefined)).toBe('');
    expect(taskStatusTransitionClassName('pending')).toBe(
      ' task-status-transition task-status-transition-pending'
    );
  });
});
