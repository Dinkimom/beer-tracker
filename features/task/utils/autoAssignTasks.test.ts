import type { Developer, Task } from '@/types';

import { afterEach, describe, expect, it } from 'vitest';

import { createQATasksMap } from '@/features/qa/utils/qaTaskUtils';
import {
  DEFAULT_PLANNER_TIMELINE_SCALE,
  setActivePlannerTimelineScale,
} from '@/lib/plannerTimelineScale';

import { autoAssignTasks } from './autoAssignTasks';

const developers = [
  { id: 'dev', name: 'Dev', role: 'developer' },
  { id: 'qa-eng', name: 'QA', role: 'tester' },
] as Developer[];

function devTask(partial: Partial<Task> = {}): Task {
  return {
    id: 'T-1',
    link: '',
    name: 'T',
    team: 'Web',
    assignee: 'dev',
    qaEngineer: 'qa-eng',
    storyPoints: 1,
    testPoints: 1,
    ...partial,
  };
}

afterEach(() => {
  setActivePlannerTimelineScale(DEFAULT_PLANNER_TIMELINE_SCALE);
});

describe('autoAssignTasks', () => {
  it('sizes dev and QA cards through the org scale and places QA after dev', () => {
    setActivePlannerTimelineScale({ estimateUnit: 'day', timeslotsPerDay: 3 });
    const tasks = [devTask()];
    const qaMap = createQATasksMap(tasks);
    const result = autoAssignTasks(tasks, developers, new Map(), qaMap, [], 0, 30);
    const devPos = result.positions.get('T-1');
    const qaPos = result.positions.get(qaMap.get('T-1')!.id);
    expect(devPos).toMatchObject({ duration: 3, startDay: 0, startPart: 0 });
    expect(qaPos).toMatchObject({ assignee: 'qa-eng', duration: 3, startDay: 1, startPart: 0 });
    expect(result.links).toHaveLength(1);
  });

  it('skips the QA card when it does not fit before the sprint end', () => {
    setActivePlannerTimelineScale({ estimateUnit: 'day', timeslotsPerDay: 3 });
    const tasks = [devTask({ storyPoints: 10 })];
    const qaMap = createQATasksMap(tasks);
    const result = autoAssignTasks(tasks, developers, new Map(), qaMap, [], 0, 30);
    expect(result.positions.get('T-1')?.duration).toBe(30);
    expect(result.positions.has(qaMap.get('T-1')!.id)).toBe(false);
    expect(result.links).toHaveLength(0);
  });
});
