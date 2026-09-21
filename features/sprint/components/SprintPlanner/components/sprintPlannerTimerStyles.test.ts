import { describe, expect, it } from 'vitest';

import {
  isSprintPlannerTimerActiveStatus,
  SPRINT_PLANNER_TIMER_POPOVER_CLASS,
  sprintPlannerTimerTriggerClassName,
} from './sprintPlannerTimerStyles';

describe('sprintPlannerTimerStyles', () => {
  it('treats running and paused as active chip states', () => {
    expect(isSprintPlannerTimerActiveStatus('running')).toBe(true);
    expect(isSprintPlannerTimerActiveStatus('paused')).toBe(true);
    expect(isSprintPlannerTimerActiveStatus('idle')).toBe(false);
    expect(isSprintPlannerTimerActiveStatus('finished')).toBe(false);
  });

  it('uses borderless rounded trigger without outline variant classes', () => {
    expect(sprintPlannerTimerTriggerClassName('idle', false)).toContain('rounded-lg');
    expect(sprintPlannerTimerTriggerClassName('idle', false)).not.toContain('rounded-full');
    expect(sprintPlannerTimerTriggerClassName('idle', false)).toContain('border-0');
    expect(sprintPlannerTimerTriggerClassName('running', false)).not.toContain('border-amber');
    expect(sprintPlannerTimerTriggerClassName('paused', false)).not.toContain('border-amber');
  });

  it('keeps the popover compact with room around the clock', () => {
    expect(SPRINT_PLANNER_TIMER_POPOVER_CLASS).toContain('w-52');
    expect(SPRINT_PLANNER_TIMER_POPOVER_CLASS).toContain('p-3');
  });

  it('shows open backdrop on active trigger while popover is open', () => {
    const open = sprintPlannerTimerTriggerClassName('running', true);
    expect(open).toContain('bg-gray-100 text-gray-800');
    expect(open).not.toContain('bg-transparent');
    expect(sprintPlannerTimerTriggerClassName('running', false)).not.toContain('bg-gray-100 text-gray-800');
  });
});
