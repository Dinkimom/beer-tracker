import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import {
  removeEpicFromQuarterlyPlan,
  removeStoryFromQuarterlyPlan,
  removeTaskFromQuarterlyPlan,
} from './quarterlyPlanRemove';

const storyTask: Task = {
  id: 'STORY-1',
  name: 'Story',
  link: '#',
  team: 'Back',
  parent: { id: 'EPIC-1', display: 'Epic', key: 'EPIC-1' },
};

const epicTask: Task = {
  id: 'EPIC-1',
  name: 'Epic',
  link: '#',
  team: 'Back',
};

describe('quarterlyPlanRemove', () => {
  it('removeEpic drops epic, child phases and exclusions', () => {
    const result = removeEpicFromQuarterlyPlan(
      {
        planEpicKeys: ['EPIC-1', 'EPIC-2'],
        storyPhases: {
          'EPIC-1': [{ id: 'p1', kind: 'delivery', sprintIndex: 0, startDay: 0, durationDays: 5 }],
          'STORY-1': [{ id: 'p2', kind: 'delivery', sprintIndex: 0, startDay: 0, durationDays: 3 }],
        },
        excludedStoryKeys: ['STORY-1'],
        storyEvents: { 'STORY-1': [{ id: 'ev1', kind: 'task_released', weekIndex: 0 }] },
      },
      'EPIC-1',
      [storyTask, epicTask]
    );
    expect(result.planEpicKeys).toEqual(['EPIC-2']);
    expect(result.storyPhases).toEqual({});
    expect(result.excludedStoryKeys).toEqual([]);
    expect(result.storyEvents).toEqual({});
  });

  it('removeStory adds exclusion and clears phases', () => {
    const result = removeStoryFromQuarterlyPlan(
      {
        planEpicKeys: ['EPIC-1'],
        storyPhases: {
          'STORY-1': [{ id: 'p1', kind: 'delivery', sprintIndex: 0, startDay: 0, durationDays: 3 }],
        },
        excludedStoryKeys: [],
        storyEvents: {},
      },
      'STORY-1'
    );
    expect(result.planEpicKeys).toEqual(['EPIC-1']);
    expect(result.storyPhases).toEqual({});
    expect(result.excludedStoryKeys).toEqual(['STORY-1']);
  });

  it('removeTask routes story vs epic', () => {
    const afterStory = removeTaskFromQuarterlyPlan(
      {
        planEpicKeys: ['EPIC-1'],
        storyPhases: { 'STORY-1': [{ id: 'p1', kind: 'delivery', sprintIndex: 0, startDay: 0, durationDays: 1 }] },
        excludedStoryKeys: [],
        storyEvents: {},
      },
      storyTask,
      [storyTask, epicTask]
    );
    expect(afterStory.excludedStoryKeys).toContain('STORY-1');

    const afterEpic = removeTaskFromQuarterlyPlan(
      {
        planEpicKeys: ['EPIC-1'],
        storyPhases: { 'EPIC-1': [{ id: 'p1', kind: 'delivery', sprintIndex: 0, startDay: 0, durationDays: 1 }] },
        excludedStoryKeys: [],
        storyEvents: {},
      },
      epicTask,
      [epicTask]
    );
    expect(afterEpic.planEpicKeys).toEqual([]);
  });
});
