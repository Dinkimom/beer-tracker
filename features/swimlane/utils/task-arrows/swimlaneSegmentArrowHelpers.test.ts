import type { Task, TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import { PARTS_PER_DAY } from '@/constants';
import {
  buildSwimlaneSegmentArrowLinks,
  getSwimlanePlanSegmentHtmlAnchorId,
} from '@/features/swimlane/utils/task-arrows/swimlaneSegmentArrowHelpers';

function posFromCells(startCell: number, endCell: number): TaskPosition {
  const duration = endCell - startCell;
  return {
    assignee: 'u',
    duration,
    startDay: Math.floor(startCell / PARTS_PER_DAY),
    startPart: startCell % PARTS_PER_DAY,
    taskId: 't',
  };
}

describe('getSwimlanePlanSegmentHtmlAnchorId', () => {
  it('uses task id for the first segment and seg suffix for the rest', () => {
    expect(getSwimlanePlanSegmentHtmlAnchorId('abc', 0)).toBe('task-abc');
    expect(getSwimlanePlanSegmentHtmlAnchorId('abc', 1)).toBe('task-abc-seg-1');
    expect(getSwimlanePlanSegmentHtmlAnchorId('abc', 2)).toBe('task-abc-seg-2');
  });
});

describe('buildSwimlaneSegmentArrowLinks', () => {
  it('returns empty when no positions or fewer than two segments', () => {
    expect(buildSwimlaneSegmentArrowLinks(undefined)).toEqual([]);
    expect(
      buildSwimlaneSegmentArrowLinks(
        new Map([['t1', posFromCells(0, 2)]])
      )
    ).toEqual([]);
  });

  it('links consecutive ordered segments of the same task', () => {
    const positions = new Map<string, TaskPosition>([
      [
        'task-1',
        {
          ...posFromCells(0, 6),
          segments: [
            { duration: 1, startDay: 1, startPart: 0 },
            { duration: 1, startDay: 0, startPart: 0 },
            { duration: 1, startDay: 2, startPart: 0 },
          ],
        },
      ],
    ]);

    expect(buildSwimlaneSegmentArrowLinks(positions)).toEqual([
      {
        endElement: 'task-task-1-seg-1',
        id: 'swimlane-segment-task-1-0-1',
        startElement: 'task-task-1',
        taskId: 'task-1',
      },
      {
        endElement: 'task-task-1-seg-2',
        id: 'swimlane-segment-task-1-1-2',
        startElement: 'task-task-1-seg-1',
        taskId: 'task-1',
      },
    ]);
  });

  it('skips excluded and non-visible assignees', () => {
    const positions = new Map<string, TaskPosition>([
      [
        'a',
        {
          ...posFromCells(0, 4),
          assignee: 'dev-a',
          segments: [
            { duration: 1, startDay: 0, startPart: 0 },
            { duration: 1, startDay: 1, startPart: 0 },
          ],
        },
      ],
      [
        'b',
        {
          ...posFromCells(0, 4),
          assignee: 'dev-b',
          segments: [
            { duration: 1, startDay: 0, startPart: 0 },
            { duration: 1, startDay: 1, startPart: 0 },
          ],
        },
      ],
    ]);

    expect(
      buildSwimlaneSegmentArrowLinks(positions, {
        excludeTaskIds: new Set(['a']),
        visibleDeveloperIds: new Set(['dev-b']),
      }).map((l) => l.taskId)
    ).toEqual(['b']);

    expect(
      buildSwimlaneSegmentArrowLinks(positions, {
        visibleDeveloperIds: new Set(['dev-a']),
        tasksMap: new Map([['b', { id: 'b', assignee: 'dev-b' } as Task]]),
      }).map((l) => l.taskId)
    ).toEqual(['a']);
  });
});
