import type { Task, TaskPosition } from '@/types';
import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { describe, expect, it } from 'vitest';

import {
  buildDeveloperAvailabilityMap,
  computeHoverConnectedTaskIds,
  partitionPinnedSwimlaneRows,
  togglePinnedSwimlaneRowId,
} from '@/features/sprint/components/SprintPlanner/utils/swimlanesSectionHelpers';

describe('buildDeveloperAvailabilityMap', () => {
  it('returns empty when board events are missing', () => {
    expect(buildDeveloperAvailabilityMap(undefined, [{ id: 'a' }])).toEqual(new Map());
    expect(buildDeveloperAvailabilityMap(null, [{ id: 'a' }])).toEqual(new Map());
    expect(buildDeveloperAvailabilityMap([], [{ id: 'a' }])).toEqual(new Map());
  });

  it('maps only developers with board availability events', () => {
    const boardEvents: BoardAvailabilityEvent[] = [
      {
        endDate: '2025-01-05',
        eventType: 'tech_sprint',
        id: 'ts1',
        memberId: 'u1',
        memberName: 'A',
        startDate: '2025-01-01',
        techSprintSubtype: 'back',
      },
      {
        endDate: '2025-02-10',
        eventType: 'vacation',
        id: 'v1',
        memberId: 'u2',
        memberName: 'B',
        startDate: '2025-02-01',
      },
    ];
    const map = buildDeveloperAvailabilityMap(boardEvents, [
      { id: 'u1' },
      { id: 'u2' },
      { id: 'u3' },
    ]);
    expect(map.size).toBe(2);
    expect(map.get('u1')?.boardEvents).toEqual([boardEvents[0]!]);
    expect(map.get('u2')?.boardEvents).toEqual([boardEvents[1]!]);
    expect(map.has('u3')).toBe(false);
  });
});

describe('computeHoverConnectedTaskIds', () => {
  it('returns null when no hovered task', () => {
    expect(computeHoverConnectedTaskIds(null, [], undefined, undefined)).toBeNull();
  });

  it('includes the direct later endpoint when hovering the earlier card', () => {
    const set = computeHoverConnectedTaskIds(
      'a',
      [
        { fromTaskId: 'a', toTaskId: 'b' },
        { fromTaskId: 'c', toTaskId: 'd' },
      ],
      undefined,
      undefined
    );
    expect(set).toEqual(new Set(['a', 'b']));
  });

  it('includes all predecessors and only one hop forward', () => {
    const set = computeHoverConnectedTaskIds(
      'b',
      [
        { fromTaskId: 'a', toTaskId: 'b' },
        { fromTaskId: 'b', toTaskId: 'c' },
        { fromTaskId: 'c', toTaskId: 'd' },
        { fromTaskId: 'x', toTaskId: 'y' },
      ],
      undefined,
      undefined
    );
    expect(set).toEqual(new Set(['a', 'b', 'c']));
  });

  it('includes later QA when hovering the earlier dev task (blocks QA)', () => {
    const qaTasksMap = new Map<string, Task>([
      ['dev1', { id: 'qa1' } as Task],
    ]);
    const taskPositions = new Map<string, TaskPosition>([
      [
        'dev1',
        {
          assignee: 'dev',
          duration: 2,
          startDay: 0,
          startPart: 0,
          taskId: 'dev1',
        },
      ],
      [
        'qa1',
        {
          assignee: 'qa',
          duration: 2,
          startDay: 1,
          startPart: 0,
          taskId: 'qa1',
        },
      ],
    ]);
    const set = computeHoverConnectedTaskIds('dev1', [], qaTasksMap, taskPositions);
    expect(set).toEqual(new Set(['dev1', 'qa1']));
  });

  it('includes earlier dev when hovering QA', () => {
    const qaTasksMap = new Map<string, Task>([
      ['dev1', { id: 'qa1' } as Task],
    ]);
    const taskPositions = new Map<string, TaskPosition>([
      [
        'dev1',
        {
          assignee: 'dev',
          duration: 2,
          startDay: 0,
          startPart: 0,
          taskId: 'dev1',
        },
      ],
      [
        'qa1',
        {
          assignee: 'qa',
          duration: 2,
          startDay: 1,
          startPart: 0,
          taskId: 'qa1',
        },
      ],
    ]);
    const set = computeHoverConnectedTaskIds('qa1', [], qaTasksMap, taskPositions);
    expect(set).toEqual(new Set(['dev1', 'qa1']));
  });
});

describe('partitionPinnedSwimlaneRows', () => {
  it('keeps original order within pinned and unpinned groups', () => {
    expect(
      partitionPinnedSwimlaneRows(
        [{ id: 'team' }, { id: 'a' }, { id: 'b' }, { id: 'c' }],
        ['c', 'team']
      )
    ).toEqual({
      pinned: [{ id: 'team' }, { id: 'c' }],
      unpinned: [{ id: 'a' }, { id: 'b' }],
    });
  });

  it('treats unknown pin ids as empty', () => {
    expect(partitionPinnedSwimlaneRows([{ id: 'a' }], ['missing'])).toEqual({
      pinned: [],
      unpinned: [{ id: 'a' }],
    });
  });
});

describe('togglePinnedSwimlaneRowId', () => {
  it('adds and removes an id', () => {
    expect(togglePinnedSwimlaneRowId(['team'], 'a')).toEqual(['team', 'a']);
    expect(togglePinnedSwimlaneRowId(['team', 'a'], 'a')).toEqual(['team']);
  });
});
