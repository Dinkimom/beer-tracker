import type { FlattenedRow } from '@/features/sprint/components/SprintPlanner/occupancy/utils/buildFlattenedRows';
import type { Task, TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import { PARTS_PER_DAY, WORKING_DAYS } from '@/constants';

import {
  buildAssigneeIdToTaskPositions,
  buildTaskPlanHeightSignaturesMap,
  computeBurndownTilesFromOccupancyRows,
  computeHoverConnectedPhaseIds,
  computeOccupancyTaskTotals,
  computeSourceRowEndCellIndex,
  computeSourceRowPhaseIds,
  resolveOccupancyTimelineWidths,
} from './occupancyViewHelpers';

function task(partial: Partial<Task> & { id: string; name: string }): Task {
  return {
    link: '',
    team: 'Web',
    ...partial,
  };
}

function pos(overrides: Partial<TaskPosition> & Pick<TaskPosition, 'assignee'>): TaskPosition {
  return {
    duration: 1,
    startDay: 0,
    startPart: 0,
    taskId: 'test-pos',
    ...overrides,
  };
}

describe('computeOccupancyTaskTotals', () => {
  it('returns zeros for empty rows', () => {
    expect(computeOccupancyTaskTotals([], new Map())).toEqual({ totalStoryPoints: 0, totalTestPoints: 0 });
  });

  it('ignores parent rows', () => {
    const rows: FlattenedRow[] = [{ type: 'parent', id: 'p1', display: 'P' }];
    const positions = new Map<string, TaskPosition>();
    expect(computeOccupancyTaskTotals(rows, positions)).toEqual({ totalStoryPoints: 0, totalTestPoints: 0 });
  });

  it('counts task rows even when dev and QA are not placed on the timeline', () => {
    const t1 = task({ id: 't1', name: 'a', storyPoints: 5, testPoints: 2 });
    const rows: FlattenedRow[] = [{ type: 'task', task: t1 }];
    expect(computeOccupancyTaskTotals(rows, new Map())).toEqual({ totalStoryPoints: 5, totalTestPoints: 2 });
  });

  it('sums story and test points when dev phase exists', () => {
    const t1 = task({ id: 't1', name: 'a', storyPoints: 5, testPoints: 2 });
    const rows: FlattenedRow[] = [{ type: 'task', task: t1 }];
    const positions = new Map<string, TaskPosition>([['t1', pos({ assignee: 'u1' })]]);
    expect(computeOccupancyTaskTotals(rows, positions)).toEqual({ totalStoryPoints: 5, totalTestPoints: 2 });
  });

  it('sums dev and separate QA test points on one row', () => {
    const dev = task({ id: 'dev1', name: 'd', storyPoints: 3, testPoints: 1 });
    const qa = task({ id: 'qa1', name: 'q', team: 'QA', storyPoints: 0, testPoints: 8 });
    const rows: FlattenedRow[] = [{ type: 'task', task: dev, qaTask: qa }];
    const positions = new Map<string, TaskPosition>([
      ['dev1', pos({ assignee: 'u1' })],
      ['qa1', pos({ assignee: 'u2' })],
    ]);
    expect(computeOccupancyTaskTotals(rows, positions)).toEqual({ totalStoryPoints: 3, totalTestPoints: 9 });
  });

  it('does not double-count TP for synthetic QA linked to dev', () => {
    const dev = task({ id: 'dev1', name: 'd', storyPoints: 3, testPoints: 5 });
    const phantom = task({
      id: 'syn-qa',
      name: '[QA] d',
      team: 'QA',
      originalTaskId: 'dev1',
      storyPoints: 0,
      testPoints: 5,
    });
    const rows: FlattenedRow[] = [{ type: 'task', task: dev, qaTask: phantom }];
    const positions = new Map<string, TaskPosition>([
      ['dev1', pos({ assignee: 'u1' })],
      ['syn-qa', pos({ assignee: 'u2' })],
    ]);
    expect(computeOccupancyTaskTotals(rows, positions)).toEqual({ totalStoryPoints: 3, totalTestPoints: 5 });
  });
});

describe('computeBurndownTilesFromOccupancyRows', () => {
  it('matches occupancy totals and completion when dev and QA phases exist', () => {
    const dev = task({ id: 'dev1', name: 'd', storyPoints: 3, testPoints: 1, status: 'done' });
    const qa = task({
      id: 'qa1',
      name: 'q',
      team: 'QA',
      storyPoints: 0,
      testPoints: 8,
      status: 'done',
    });
    const rows: FlattenedRow[] = [{ type: 'task', task: dev, qaTask: qa }];
    const positions = new Map<string, TaskPosition>([
      ['dev1', pos({ assignee: 'u1' })],
      ['qa1', pos({ assignee: 'u2' })],
    ]);
    const totals = computeOccupancyTaskTotals(rows, positions);
    const tiles = computeBurndownTilesFromOccupancyRows(rows, positions);
    expect(tiles.totalScopeSP).toBe(totals.totalStoryPoints);
    expect(tiles.totalScopeTP).toBe(totals.totalTestPoints);
    expect(tiles.completedSP).toBe(3);
    expect(tiles.completedTP).toBe(9);
    expect(tiles.completionPercentSP).toBe(100);
    expect(tiles.completionPercentTP).toBe(100);
  });

  it('counts completed TP per dev and QA when both contribute', () => {
    const dev = task({ id: 'dev1', name: 'd', storyPoints: 2, testPoints: 1, status: 'done' });
    const qa = task({
      id: 'qa1',
      name: 'q',
      team: 'QA',
      storyPoints: 0,
      testPoints: 4,
      status: 'todo',
    });
    const rows: FlattenedRow[] = [{ type: 'task', task: dev, qaTask: qa }];
    const positions = new Map<string, TaskPosition>([
      ['dev1', pos({ assignee: 'u1' })],
      ['qa1', pos({ assignee: 'u2' })],
    ]);
    const tiles = computeBurndownTilesFromOccupancyRows(rows, positions);
    expect(tiles.totalScopeTP).toBe(5);
    expect(tiles.completedTP).toBe(1);
    expect(tiles.completedSP).toBe(2);
  });

  it('includes scope and completion for tasks not placed on the timeline', () => {
    const dev = task({ id: 'dev1', name: 'd', storyPoints: 4, testPoints: 2, status: 'done' });
    const rows: FlattenedRow[] = [{ type: 'task', task: dev }];
    const tiles = computeBurndownTilesFromOccupancyRows(rows, new Map());
    expect(tiles.totalScopeSP).toBe(4);
    expect(tiles.totalScopeTP).toBe(2);
    expect(tiles.completedSP).toBe(4);
    expect(tiles.completedTP).toBe(2);
    expect(tiles.completionPercentSP).toBe(100);
    expect(tiles.completionPercentTP).toBe(100);
  });
});

describe('buildTaskPlanHeightSignaturesMap', () => {
  it('maps dev and separate qa presence', () => {
    const dev = task({ id: 'd1', name: 'd' });
    const qa = task({ id: 'q1', name: 'q' });
    const rows: FlattenedRow[] = [{ type: 'task', task: dev, qaTask: qa }];
    const positions = new Map<string, TaskPosition>([
      ['d1', pos({ assignee: 'a' })],
      ['q1', pos({ assignee: 'b' })],
    ]);
    const m = buildTaskPlanHeightSignaturesMap(rows, positions);
    expect(m.get('d1')).toBe('1:1');
  });

  it('uses dash for qa slot when qa is same id as dev or missing', () => {
    const t = task({ id: 't1', name: 'x' });
    const rowsSame: FlattenedRow[] = [{ type: 'task', task: t, qaTask: t }];
    expect(buildTaskPlanHeightSignaturesMap(rowsSame, new Map([['t1', pos({ assignee: 'a' })]])).get('t1')).toBe(
      '1:-'
    );

    const rowsNoQa: FlattenedRow[] = [{ type: 'task', task: t }];
    expect(buildTaskPlanHeightSignaturesMap(rowsNoQa, new Map([['t1', pos({ assignee: 'a' })]])).get('t1')).toBe(
      '1:-'
    );
  });
});

describe('buildAssigneeIdToTaskPositions', () => {
  it('groups by assignee when position and assignee exist', () => {
    const t1 = task({ id: 't1', name: 'a', assignee: 'u1' });
    const t2 = task({ id: 't2', name: 'b', assignee: 'u1' });
    const p1 = pos({ assignee: 'u1', startDay: 1 });
    const positions = new Map<string, TaskPosition>([
      ['t1', p1],
      ['t2', pos({ assignee: 'u1', startDay: 2 })],
    ]);
    const map = buildAssigneeIdToTaskPositions([t1, t2], positions);
    expect(map.get('u1')).toHaveLength(2);
    expect(map.get('u1')?.[0]).toEqual({ taskId: 't1', position: p1 });
  });

  it('skips tasks without position or assignee', () => {
    const t = task({ id: 't1', name: 'a' });
    expect(buildAssigneeIdToTaskPositions([t], new Map()).size).toBe(0);
  });
});

describe('computeHoverConnectedPhaseIds', () => {
  it('returns null when nothing hovered', () => {
    expect(
      computeHoverConnectedPhaseIds({
        devToQaTaskId: new Map(),
        hoveredPhaseTaskId: null,
        taskLinks: [],
        taskPositions: new Map(),
        tasks: [],
      })
    ).toBeNull();
  });

  it('adds predecessors, later QA when hovering earlier, and originalTaskId', () => {
    const dev = task({ id: 'dev', name: 'd' });
    const qa = task({ id: 'qa', name: 'q', originalTaskId: 'dev' });
    const set = computeHoverConnectedPhaseIds({
      devToQaTaskId: new Map([['dev', 'qa']]),
      hoveredPhaseTaskId: 'dev',
      taskLinks: [{ fromTaskId: 'other', id: 'l1', toTaskId: 'dev' }],
      taskPositions: new Map(),
      tasks: [dev, qa],
    });
    expect(set).toEqual(new Set(['dev', 'other', 'qa']));
  });

  it('includes all predecessors and only the next hop forward', () => {
    const set = computeHoverConnectedPhaseIds({
      devToQaTaskId: new Map(),
      hoveredPhaseTaskId: 'c',
      taskLinks: [
        { fromTaskId: 'a', id: 'l1', toTaskId: 'b' },
        { fromTaskId: 'b', id: 'l2', toTaskId: 'c' },
        { fromTaskId: 'c', id: 'l3', toTaskId: 'd' },
        { fromTaskId: 'd', id: 'l4', toTaskId: 'e' },
      ],
      taskPositions: new Map(),
      tasks: [],
    });
    expect(set).toEqual(new Set(['a', 'b', 'c', 'd']));
  });
});

describe('computeSourceRowPhaseIds', () => {
  it('returns null when not linking', () => {
    expect(
      computeSourceRowPhaseIds({
        devToQaTaskId: new Map(),
        linkingFromTaskId: null,
        tasks: [],
      })
    ).toBeNull();
  });

  it('includes original dev id and QA phase id', () => {
    const qa = task({ id: 'qa', name: 'q', originalTaskId: 'dev' });
    const set = computeSourceRowPhaseIds({
      devToQaTaskId: new Map([['qa', 'qa2']]),
      linkingFromTaskId: 'qa',
      tasks: [qa],
    });
    expect(set).toEqual(new Set(['qa', 'dev', 'qa2']));
  });
});

describe('computeSourceRowEndCellIndex', () => {
  it('returns null for empty or null phase set', () => {
    expect(
      computeSourceRowEndCellIndex({
        cellsPerDay: 3,
        sourceRowPhaseIds: null,
        taskPositions: new Map(),
      })
    ).toBeNull();
    expect(
      computeSourceRowEndCellIndex({
        cellsPerDay: 3,
        sourceRowPhaseIds: new Set(),
        taskPositions: new Map(),
      })
    ).toBeNull();
  });

  it('uses day cells when cellsPerDay is 1', () => {
    // duration 5 parts → ceil(5/3)=2 days → end = startDay + 2
    const positions = new Map<string, TaskPosition>([
      ['p1', pos({ assignee: 'a', startDay: 0, startPart: 0, duration: 5 })],
    ]);
    expect(
      computeSourceRowEndCellIndex({
        cellsPerDay: 1,
        sourceRowPhaseIds: new Set(['p1']),
        taskPositions: positions,
      })
    ).toBe(2);
  });

  it('uses part grid when cellsPerDay is 3', () => {
    const positions = new Map<string, TaskPosition>([
      ['p1', pos({ assignee: 'a', startDay: 1, startPart: 2, duration: 4 })],
    ]);
    const end = 1 * PARTS_PER_DAY + 2 + 4;
    expect(
      computeSourceRowEndCellIndex({
        cellsPerDay: 3,
        sourceRowPhaseIds: new Set(['p1']),
        taskPositions: positions,
      })
    ).toBe(end);
  });
});

describe('resolveOccupancyTimelineWidths', () => {
  const base = {
    baseDayColumnWidth: 40,
    baseTableWidth: 800,
    displayAsWeeks: false,
    displayColumnCount: WORKING_DAYS,
    quarterlyPhaseStyle: false,
    sprintCount: 1,
    taskColumnWidth: 200,
    timelinePartWidth: 600,
    workingDays: WORKING_DAYS,
  };

  it('returns base widths for single sprint', () => {
    expect(resolveOccupancyTimelineWidths(base)).toEqual({
      dayColumnWidth: 40,
      tableWidth: 800,
    });
  });

  it('returns base when timeline part is zero', () => {
    expect(
      resolveOccupancyTimelineWidths({
        ...base,
        sprintCount: 2,
        timelinePartWidth: 0,
      })
    ).toEqual({ dayColumnWidth: 40, tableWidth: 800 });
  });

  it('scales multi-sprint columns with divisor 10 by default', () => {
    const r = resolveOccupancyTimelineWidths({
      ...base,
      sprintCount: 2,
      timelinePartWidth: 1000,
    });
    expect(r.dayColumnWidth).toBe(100);
    expect(r.tableWidth).toBe(200 + (1000 / 10) * WORKING_DAYS);
  });

  it('doubles divisor when quarterlyPhaseStyle', () => {
    const r = resolveOccupancyTimelineWidths({
      ...base,
      sprintCount: 2,
      quarterlyPhaseStyle: true,
      timelinePartWidth: 800,
    });
    expect(r.dayColumnWidth).toBe(40);
    expect(r.tableWidth).toBe(200 + (800 / 20) * WORKING_DAYS);
  });

  it('uses week layout when displayAsWeeks', () => {
    const r = resolveOccupancyTimelineWidths({
      ...base,
      sprintCount: 2,
      displayAsWeeks: true,
      displayColumnCount: 5,
      timelinePartWidth: 500,
    });
    expect(r.dayColumnWidth).toBe(100);
    expect(r.tableWidth).toBe(200 + 500);
  });
});
