import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import { TASK_GROUP_KEY_NO_PARENT } from '@/features/task/constants/taskGroupKeys';

import { buildKanbanParentLanes } from './kanbanViewLaneHelpers';

function task(partial: Partial<Task> & Pick<Task, 'id' | 'name'>): Task {
  return {
    link: '#',
    status: 'todo',
    team: 'Back',
    ...partial,
  };
}

describe('buildKanbanParentLanes', () => {
  it('groups by parent and puts tasks without parent at the end', () => {
    const lanes = buildKanbanParentLanes([
      task({
        id: 'T-1',
        name: 'A',
        parent: { display: 'Story One', id: '1', key: 'ST-1' },
      }),
      task({ id: 'T-2', name: 'B' }),
      task({
        id: 'T-3',
        name: 'C',
        parent: { display: 'Story One', id: '1', key: 'ST-1' },
      }),
    ]);

    expect(lanes.map((lane) => lane.laneKey)).toEqual(['1', '__no_parent__']);
    expect(lanes[0]?.parentKey).toBe('ST-1');
    expect(lanes[0]?.parentDisplay).toBe('Story One');
    expect(lanes[0]?.tasks.map((t) => t.id)).toEqual(['T-1', 'T-3']);
    expect(lanes[1]?.laneName).toBe(TASK_GROUP_KEY_NO_PARENT);
    expect(lanes[1]?.tasks.map((t) => t.id)).toEqual(['T-2']);
  });

  it('falls back to epic when parent is missing, like occupancy', () => {
    const lanes = buildKanbanParentLanes([
      task({
        id: 'T-1',
        name: 'A',
        epic: { display: 'Epic Two', id: '2', key: 'EP-2' },
      }),
      task({ id: 'T-2', name: 'B' }),
    ]);

    expect(lanes.map((lane) => lane.laneKey)).toEqual(['2', '__no_parent__']);
    expect(lanes[0]?.parentKey).toBe('EP-2');
    expect(lanes[0]?.parentDisplay).toBe('Epic Two');
    expect(lanes[0]?.tasks.map((t) => t.id)).toEqual(['T-1']);
  });

  it('prefers parent over epic on the same task', () => {
    const lanes = buildKanbanParentLanes([
      task({
        id: 'T-1',
        name: 'A',
        epic: { display: 'Epic', id: 'e', key: 'EP-1' },
        parent: { display: 'Story', id: 's', key: 'ST-1' },
      }),
    ]);

    expect(lanes).toHaveLength(1);
    expect(lanes[0]?.laneKey).toBe('s');
    expect(lanes[0]?.parentKey).toBe('ST-1');
    expect(lanes[0]?.parentDisplay).toBe('Story');
  });

  it('extracts parent issue key from self when parent.key is missing', () => {
    const lanes = buildKanbanParentLanes([
      task({
        id: 'T-1',
        name: 'A',
        parent: {
          display: 'Parent',
          id: 'p1',
          key: '',
          self: 'https://tracker.yandex.ru/issues/PROJ-123',
        },
      }),
    ]);

    expect(lanes).toHaveLength(1);
    expect(lanes[0]?.laneKey).toBe('p1');
    expect(lanes[0]?.parentKey).toBe('PROJ-123');
  });
});
