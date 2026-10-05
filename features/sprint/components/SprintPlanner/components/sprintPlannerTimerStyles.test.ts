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

  it('uses a borderless rounded trigger', () => {
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

  it('uses a veil instead of a gray tile when the trigger sits on glass', () => {
    const open = sprintPlannerTimerTriggerClassName('running', true, 'glass');
    expect(open).toContain('bg-black/10');
    expect(open).not.toContain('bg-gray-100');
    const idle = sprintPlannerTimerTriggerClassName('idle', false, 'glass');
    expect(idle).toContain('hover:bg-black/10');
    expect(idle).not.toContain('hover:bg-gray-100');
  });
});
