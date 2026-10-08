import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import {
  applyEstimateToTasks,
  shouldUpdateEstimateOnResize,
} from './useSprintPlannerEstimateHandlersHelpers';

describe('applyEstimateToTasks', () => {
  it('обновляет только storyPoints у целевой задачи', () => {
    const task = { id: 'NW-1', storyPoints: 3, testPoints: 2 } as Task;
    const other = { id: 'NW-2', storyPoints: 5, testPoints: 1 } as Task;

    const next = applyEstimateToTasks([task, other], task, 8, false);

    expect(next[0]).toEqual({ id: 'NW-1', storyPoints: 8, testPoints: 2 });
    expect(next[1]).toBe(other);
  });

  it('обновляет testPoints на dev-задаче и связанной QA', () => {
    const dev = { id: 'NW-1', storyPoints: 3, testPoints: 2 } as Task;
    const qa = { id: 'NW-1-qa', originalTaskId: 'NW-1', testPoints: 2 } as Task;

    const next = applyEstimateToTasks([dev, qa], qa, 5, true);

    expect(next[0]?.testPoints).toBe(5);
    expect(next[1]?.testPoints).toBe(5);
    expect(next[0]?.storyPoints).toBe(3);
  });
});

describe('shouldUpdateEstimateOnResize', () => {
  it('true когда оценка по длительности изменилась', () => {
    const task = { id: 'NW-1' } as Task;
    expect(shouldUpdateEstimateOnResize(task, 3, 8)).toBe(true);
  });

  it('false когда оценка не изменилась или нет задачи', () => {
    const task = { id: 'NW-1' } as Task;
    expect(shouldUpdateEstimateOnResize(task, 8, 8)).toBe(false);
    expect(shouldUpdateEstimateOnResize(undefined, 3, 8)).toBe(false);
    expect(shouldUpdateEstimateOnResize(task, null, 8)).toBe(false);
  });
});
