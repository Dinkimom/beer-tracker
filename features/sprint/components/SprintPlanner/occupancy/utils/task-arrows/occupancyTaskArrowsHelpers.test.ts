import type { Task, TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import { PARTS_PER_DAY } from '@/constants';
import {
  getOccupancyPhaseBarHtmlAnchorId,
  getOccupancyPlanSegmentHtmlAnchorId,
} from '@/features/sprint/components/SprintPlanner/occupancy/utils/task-arrows/occupancyTaskArrowsEndpointHelpers';
import {
  buildOccupancyDevToQaLinks,
  buildOccupancySegmentArrowLinks,
  filterOccupancyUserTaskLinks,
  getLeftmostTaskIdInRow,
  getOccupancyRowTaskIds,
  getOccupancyTaskPositionsSignature,
  getRightmostTaskIdInRow,
  resolveOccupancyArrowEndpoints,
} from '@/features/sprint/components/SprintPlanner/occupancy/utils/task-arrows/occupancyTaskArrowsHelpers';
import { TASK_ARROWS_DEV_QA_LINK_PREFIX } from '@/features/swimlane/utils/task-arrows/taskArrowsHelpers';

/** Упрощённая позиция по диапазону ячеек (для тестов хелперов стрелок). */
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

describe('getOccupancyTaskPositionsSignature', () => {
  it('is stable for same positions', () => {
    const m = new Map<string, TaskPosition>([
      ['b', posFromCells(1, 3)],
      ['a', posFromCells(0, 2)],
    ]);
    expect(getOccupancyTaskPositionsSignature(m)).toBe(getOccupancyTaskPositionsSignature(m));
  });
});

describe('filterOccupancyUserTaskLinks', () => {
  it('drops links whose endpoints are not in order', () => {
    const links = [{ fromTaskId: 'a', id: '1', toTaskId: 'b' }];
    expect(filterOccupancyUserTaskLinks(links, ['a'], new Map())).toHaveLength(0);
  });

  it('drops redundant dev–QA pair as user link', () => {
    const devToQa = new Map([['dev1', 'qa1']]);
    const links = [{ fromTaskId: 'dev1', id: '1', toTaskId: 'qa1' }];
    expect(filterOccupancyUserTaskLinks(links, ['dev1', 'qa1'], devToQa)).toHaveLength(0);
  });
});

describe('buildOccupancyDevToQaLinks', () => {
  it('skips when development task is not in the plan', () => {
    const devToQa = new Map([['d1', 'q1']]);
    const positions = new Map<string, TaskPosition>([['q1', posFromCells(2, 3)]]);
    expect(buildOccupancyDevToQaLinks(devToQa, positions, ['d1', 'q1'])).toHaveLength(0);
  });

  it('keeps synthetic dev-QA link when the same pair exists in persisted links', () => {
    const devToQa = new Map([['d1', 'q1']]);
    const positions = new Map<string, TaskPosition>([
      ['d1', posFromCells(0, 1)],
      ['q1', posFromCells(2, 3)],
    ]);
    const persistedLinks = [{ fromTaskId: 'd1', id: 'persisted', toTaskId: 'q1' }];
    expect(filterOccupancyUserTaskLinks(persistedLinks, ['d1', 'q1'], devToQa)).toHaveLength(0);

    const out = buildOccupancyDevToQaLinks(devToQa, positions, ['d1', 'q1']);
    expect(out).toEqual([
      {
        fromTaskId: 'd1',
        id: `${TASK_ARROWS_DEV_QA_LINK_PREFIX}d1`,
        toTaskId: 'q1',
      },
    ]);
  });
});

describe('buildOccupancySegmentArrowLinks', () => {
  it('adds dashed-arrow endpoints between sorted fragments of the same task', () => {
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

    expect(buildOccupancySegmentArrowLinks(positions, ['task-1'])).toEqual([
      {
        endElement: getOccupancyPlanSegmentHtmlAnchorId('task-1', 1),
        id: 'segment-task-1-0-1',
        startElement: getOccupancyPlanSegmentHtmlAnchorId('task-1', 0),
        taskId: 'task-1',
      },
      {
        endElement: getOccupancyPlanSegmentHtmlAnchorId('task-1', 2),
        id: 'segment-task-1-1-2',
        startElement: getOccupancyPlanSegmentHtmlAnchorId('task-1', 1),
        taskId: 'task-1',
      },
    ]);
  });
});

describe('getOccupancyRowTaskIds', () => {
  const tasksMap = new Map<string, Task>([
    ['qa1', { id: 'qa1', originalTaskId: 'dev1' } as Task],
  ]);
  const positions = new Map<string, TaskPosition>([
    ['dev1', posFromCells(0, 1)],
    ['qa1', posFromCells(2, 3)],
  ]);

  it('returns dev+qa for dev row', () => {
    const devToQa = new Map([['dev1', 'qa1']]);
    expect(getOccupancyRowTaskIds('dev1', devToQa, positions, tasksMap).sort()).toEqual([
      'dev1',
      'qa1',
    ]);
  });

  it('returns only QA when development is not in the plan', () => {
    const qaOnlyPositions = new Map<string, TaskPosition>([['qa1', posFromCells(2, 3)]]);
    const devToQa = new Map([['dev1', 'qa1']]);
    expect(getOccupancyRowTaskIds('dev1', devToQa, qaOnlyPositions, tasksMap)).toEqual(['qa1']);
    expect(getOccupancyRowTaskIds('qa1', devToQa, qaOnlyPositions, tasksMap)).toEqual(['qa1']);
  });
});

describe('getRightmostTaskIdInRow / getLeftmostTaskIdInRow', () => {
  const positions = new Map<string, TaskPosition>([
    ['a', posFromCells(0, 2)],
    ['b', posFromCells(5, 8)],
  ]);

  it('picks rightmost by end cell', () => {
    expect(getRightmostTaskIdInRow(['a', 'b'], positions)).toBe('b');
  });

  it('picks leftmost by start cell', () => {
    expect(getLeftmostTaskIdInRow(['a', 'b'], positions)).toBe('a');
  });
});

describe('resolveOccupancyArrowEndpoints', () => {
  const taskIdsOrder = ['a', 'b', 'c'];
  const positions = new Map<string, TaskPosition>([
    ['a', posFromCells(0, 2)],
    ['b', posFromCells(10, 12)],
    ['c', posFromCells(20, 22)],
  ]);
  const getRow = (id: string) => [id];

  it('attaches non-adjacent user links to full phase bars', () => {
    const r = resolveOccupancyArrowEndpoints(
      { fromTaskId: 'a', id: 'L1', toTaskId: 'c' },
      false,
      taskIdsOrder,
      positions,
      getRow
    );
    expect(r.startElement).toBe(getOccupancyPhaseBarHtmlAnchorId('a'));
    expect(r.endElement).toBe(getOccupancyPhaseBarHtmlAnchorId('c'));
  });

  it('attaches adjacent user links to full phase bars', () => {
    const r = resolveOccupancyArrowEndpoints(
      { fromTaskId: 'a', id: 'L2', toTaskId: 'b' },
      false,
      taskIdsOrder,
      positions,
      getRow
    );
    expect(r.startElement).toBe(getOccupancyPhaseBarHtmlAnchorId('a'));
    expect(r.endElement).toBe(getOccupancyPhaseBarHtmlAnchorId('b'));
  });

  it('draws adjacent links from earlier to later row regardless of link direction', () => {
    const r = resolveOccupancyArrowEndpoints(
      { fromTaskId: 'b', id: 'L3', toTaskId: 'a' },
      false,
      taskIdsOrder,
      positions,
      getRow
    );
    expect(r.startElement).toBe(getOccupancyPhaseBarHtmlAnchorId('a'));
    expect(r.endElement).toBe(getOccupancyPhaseBarHtmlAnchorId('b'));
  });

  it('when phases overlap, tip points at the phase that ends later', () => {
    const overlapPositions = new Map([
      ['short', posFromCells(2, 5)],
      ['long', posFromCells(0, 10)],
    ]);
    const r = resolveOccupancyArrowEndpoints(
      { fromTaskId: 'short', id: 'L-overlap', toTaskId: 'long' },
      false,
      ['short', 'long'],
      overlapPositions,
      (id) => [id]
    );
    expect(r.startElement).toBe(getOccupancyPhaseBarHtmlAnchorId('short'));
    expect(r.endElement).toBe(getOccupancyPhaseBarHtmlAnchorId('long'));
  });

  it('uses full phase bars for synthetic dev-QA links', () => {
    const r = resolveOccupancyArrowEndpoints(
      { fromTaskId: 'd', id: `${TASK_ARROWS_DEV_QA_LINK_PREFIX}d`, toTaskId: 'q' },
      true,
      taskIdsOrder,
      positions,
      getRow
    );
    expect(r.startElement).toBe(getOccupancyPhaseBarHtmlAnchorId('d'));
    expect(r.endElement).toBe(getOccupancyPhaseBarHtmlAnchorId('q'));
    expect(r.arrowStartTaskId).toBe('d');
    expect(r.arrowEndTaskId).toBe('q');
  });
});

describe('getOccupancyPlanSegmentHtmlAnchorId', () => {
  it('keeps the first segment on the main phase bar id', () => {
    expect(getOccupancyPlanSegmentHtmlAnchorId('task-1', 0)).toBe(
      getOccupancyPhaseBarHtmlAnchorId('task-1')
    );
  });

  it('suffixes later segments like swimlane cards', () => {
    expect(getOccupancyPlanSegmentHtmlAnchorId('task-1', 2)).toBe('occupancy-phase-task-1-seg-2');
  });
});
