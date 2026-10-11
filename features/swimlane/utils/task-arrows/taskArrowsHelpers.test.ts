import type { Task, TaskLink, TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import {
  buildDevToQaSyntheticLinks,
  buildTasksMapById,
  filterTaskLinksByPlacedEndpoints,
  filterTaskLinksByVisibleDevelopers,
  filterTaskLinksForActiveDrag,
  filterTaskLinksForSegmentEdit,
  filterTaskLinksTouchingAssignee,
  getSwimlaneTaskPositionsSignature,
  getSwimlaneVisibleAssigneesSignature,
  mergeTaskLinksWithDevQa,
  partitionTaskArrowLinks,
  resolveVisibleTaskArrowLinks,
  TASK_ARROWS_DEV_QA_LINK_PREFIX,
  taskTouchesSwimlaneArrow,
} from '@/features/swimlane/utils/task-arrows/taskArrowsHelpers';

function task(id: string, assignee?: string): Task {
  return { assignee, id } as Task;
}

function pos(assignee: string, startDay = 0, duration = 3): TaskPosition {
  return {
    assignee,
    duration,
    startDay,
    startPart: 0,
    taskId: '',
  };
}

describe('taskTouchesSwimlaneArrow', () => {
  const positions = new Map<string, TaskPosition>([
    ['dev', pos('u1')],
    ['qa', pos('u1')],
    ['other', pos('u2')],
  ]);

  it('is true for either end of a placed link', () => {
    const links = [{ fromTaskId: 'dev', toTaskId: 'other' }];
    expect(
      taskTouchesSwimlaneArrow({ taskId: 'dev', taskLinks: links, taskPositions: positions })
    ).toBe(true);
    expect(
      taskTouchesSwimlaneArrow({ taskId: 'other', taskLinks: links, taskPositions: positions })
    ).toBe(true);
  });

  it('ignores a link whose other end is not on the board', () => {
    const links = [{ fromTaskId: 'dev', toTaskId: 'missing' }];
    expect(
      taskTouchesSwimlaneArrow({ taskId: 'dev', taskLinks: links, taskPositions: positions })
    ).toBe(false);
  });

  it('is true for both ends of a dev-qa arrow', () => {
    const qaTasksMap = new Map<string, Task>([['dev', task('qa')]]);
    expect(
      taskTouchesSwimlaneArrow({
        qaTasksMap,
        taskId: 'dev',
        taskLinks: [],
        taskPositions: positions,
      })
    ).toBe(true);
    expect(
      taskTouchesSwimlaneArrow({
        qaTasksMap,
        taskId: 'qa',
        taskLinks: [],
        taskPositions: positions,
      })
    ).toBe(true);
  });
});

describe('buildTasksMapById', () => {
  it('indexes tasks by id', () => {
    const m = buildTasksMapById([task('a'), task('b')]);
    expect(m.get('a')?.id).toBe('a');
    expect(m.size).toBe(2);
  });
});

describe('buildDevToQaSyntheticLinks', () => {
  it('adds synthetic link when both tasks on board and pair not in taskLinks', () => {
    const taskLinks: TaskLink[] = [];
    const qaMap = new Map<string, Task>([['dev1', { id: 'qa1' } as Task]]);
    const positions = new Map<string, TaskPosition>([
      ['dev1', pos('u1')],
      ['qa1', pos('u1')],
    ]);
    const out = buildDevToQaSyntheticLinks(taskLinks, qaMap, positions);
    expect(out).toHaveLength(1);
    expect(out[0]!.id).toBe(`${TASK_ARROWS_DEV_QA_LINK_PREFIX}dev1`);
    expect(out[0]!.fromTaskId).toBe('dev1');
    expect(out[0]!.toTaskId).toBe('qa1');
  });

  it('skips when user link already exists', () => {
    const taskLinks: TaskLink[] = [
      { fromTaskId: 'dev1', id: 'x', toTaskId: 'qa1' },
    ];
    const qaMap = new Map<string, Task>([['dev1', { id: 'qa1' } as Task]]);
    const positions = new Map<string, TaskPosition>([
      ['dev1', pos('u1')],
      ['qa1', pos('u1')],
    ]);
    expect(buildDevToQaSyntheticLinks(taskLinks, qaMap, positions)).toHaveLength(0);
  });

  it('skips when development task is not on the board', () => {
    const qaMap = new Map<string, Task>([['dev1', { id: 'qa1' } as Task]]);
    const positions = new Map<string, TaskPosition>([['qa1', pos('u1')]]);
    expect(buildDevToQaSyntheticLinks([], qaMap, positions)).toHaveLength(0);
  });
});

describe('mergeTaskLinksWithDevQa', () => {
  it('returns only user links when qa map missing', () => {
    const links: TaskLink[] = [{ fromTaskId: 'a', id: '1', toTaskId: 'b' }];
    expect(mergeTaskLinksWithDevQa(links, undefined, undefined)).toEqual(links);
  });
});

describe('filterTaskLinksByPlacedEndpoints', () => {
  it('keeps links whose both ends are on the board', () => {
    const links: TaskLink[] = [{ fromTaskId: 'a', id: '1', toTaskId: 'b' }];
    const positions = new Map<string, TaskPosition>([
      ['a', pos('u1')],
      ['b', pos('u1')],
    ]);
    expect(filterTaskLinksByPlacedEndpoints(links, positions)).toEqual(links);
  });

  it('drops a link when the development task is not on the board', () => {
    const links: TaskLink[] = [{ fromTaskId: 'dev1', id: 'link-qa', toTaskId: 'qa1' }];
    const positions = new Map<string, TaskPosition>([['qa1', pos('u1')]]);
    expect(filterTaskLinksByPlacedEndpoints(links, positions)).toEqual([]);
  });

  it('returns links unchanged when positions are missing', () => {
    const links: TaskLink[] = [{ fromTaskId: 'a', id: '1', toTaskId: 'b' }];
    expect(filterTaskLinksByPlacedEndpoints(links, undefined)).toEqual(links);
  });
});

describe('getSwimlaneTaskPositionsSignature', () => {
  it('returns a stable key for placed task ids, rows and cells', () => {
    const positions = new Map<string, TaskPosition>([
      ['b', pos('u1', 1, 2)],
      ['a', pos('u2', 0, 3)],
    ]);
    expect(getSwimlaneTaskPositionsSignature(positions)).toBe('a:u2:0-3|b:u1:3-5');
    expect(getSwimlaneTaskPositionsSignature(undefined)).toBe('');
    expect(getSwimlaneTaskPositionsSignature(new Map())).toBe('');
  });

  it('changes when a card moves to another swimlane row', () => {
    const before = new Map<string, TaskPosition>([['a', pos('row-epic')]]);
    const after = new Map<string, TaskPosition>([['a', pos('row-story')]]);
    expect(getSwimlaneTaskPositionsSignature(before)).not.toBe(
      getSwimlaneTaskPositionsSignature(after)
    );
  });
});

describe('getSwimlaneVisibleAssigneesSignature', () => {
  it('preserves row insertion order so layout shifts trigger redraw', () => {
    expect(getSwimlaneVisibleAssigneesSignature(new Set(['epic', 'story']))).toBe('epic|story');
    expect(getSwimlaneVisibleAssigneesSignature(undefined)).toBe('');
    expect(getSwimlaneVisibleAssigneesSignature(new Set())).toBe('');
  });
});

describe('filterTaskLinksForActiveDrag', () => {
  it('removes links touching active task', () => {
    const links: TaskLink[] = [
      { fromTaskId: 'a', id: '1', toTaskId: 'b' },
      { fromTaskId: 'c', id: '2', toTaskId: 'd' },
    ];
    expect(filterTaskLinksForActiveDrag(links, 'a')).toEqual([links[1]]);
  });
});

describe('filterTaskLinksForSegmentEdit', () => {
  it('removes links touching edited task', () => {
    const links: TaskLink[] = [
      { fromTaskId: 'a', id: '1', toTaskId: 'b' },
      { fromTaskId: 'c', id: '2', toTaskId: 'd' },
    ];
    expect(filterTaskLinksForSegmentEdit(links, 'b')).toEqual([links[1]]);
  });
});

describe('filterTaskLinksByVisibleDevelopers', () => {
  const tasksMap = buildTasksMapById([task('t1', 'u1'), task('t2', 'u2')]);
  const positions = new Map<string, TaskPosition>([
    ['t1', pos('u1')],
    ['t2', pos('u2')],
  ]);
  const visible = new Set(['u1']);

  it('keeps link when both assignees visible', () => {
    const links: TaskLink[] = [{ fromTaskId: 't1', id: '1', toTaskId: 't1' }];
    expect(
      filterTaskLinksByVisibleDevelopers(links, tasksMap, positions, visible)
    ).toHaveLength(1);
  });

  it('drops link when an endpoint is hidden', () => {
    const links: TaskLink[] = [{ fromTaskId: 't1', id: '1', toTaskId: 't2' }];
    expect(
      filterTaskLinksByVisibleDevelopers(links, tasksMap, positions, visible)
    ).toHaveLength(0);
  });
});

describe('filterTaskLinksTouchingAssignee', () => {
  const tasksMap = buildTasksMapById([
    task('t1', 'u1'),
    task('t2', 'u2'),
    task('t3', 'u3'),
  ]);
  const positions = new Map<string, TaskPosition>([
    ['t1', pos('u1')],
    ['t2', pos('u2')],
    ['t3', pos('u3')],
  ]);

  it('keeps links with an endpoint on the assignee row', () => {
    const links: TaskLink[] = [
      { fromTaskId: 't1', id: '1', toTaskId: 't2' },
      { fromTaskId: 't2', id: '2', toTaskId: 't3' },
      { fromTaskId: 't1', id: '3', toTaskId: 't1' },
    ];
    expect(
      filterTaskLinksTouchingAssignee(links, tasksMap, positions, 'u1').map((l) => l.id)
    ).toEqual(['1', '3']);
  });

  it('drops links that only cross through the row geometrically', () => {
    const links: TaskLink[] = [{ fromTaskId: 't2', id: '2', toTaskId: 't3' }];
    expect(filterTaskLinksTouchingAssignee(links, tasksMap, positions, 'u1')).toEqual([]);
  });
});

describe('resolveVisibleTaskArrowLinks', () => {
  it('keeps only clip-row links that touch the pinned assignee', () => {
    const tasksMap = buildTasksMapById([
      task('t1', 'u1'),
      task('t2', 'u2'),
      task('t3', 'u3'),
    ]);
    const positions = new Map<string, TaskPosition>([
      ['t1', pos('u1')],
      ['t2', pos('u2')],
      ['t3', pos('u3')],
    ]);
    const links: TaskLink[] = [
      { fromTaskId: 't1', id: '1', toTaskId: 't2' },
      { fromTaskId: 't2', id: '2', toTaskId: 't3' },
    ];
    expect(
      resolveVisibleTaskArrowLinks({
        activeTaskId: null,
        clipToAssigneeId: 'u1',
        clipToRow: true,
        qaTasksMap: undefined,
        segmentEditTaskId: null,
        taskLinks: links,
        taskPositions: positions,
        tasksMap,
        visibleDeveloperIds: new Set(['u1', 'u2', 'u3']),
      }).map((link) => link.id)
    ).toEqual(['1']);
  });
});

describe('partitionTaskArrowLinks', () => {
  const links: TaskLink[] = [
    { fromTaskId: 'a', id: 'L1', toTaskId: 'b' },
    { fromTaskId: 'b', id: 'L2', toTaskId: 'c' },
    { fromTaskId: 'x', id: 'L3', toTaskId: 'y' },
  ];

  it('splits hovered link and task-related links', () => {
    const p = partitionTaskArrowLinks(links, 'L2', 'b');
    expect(p.hoveredLink?.id).toBe('L2');
    // L2 в верхнем слое; L1 — предшественник
    expect(p.hoveredTaskLinks.map((l) => l.id)).toEqual(['L1']);
    expect(p.regularLinks.map((l) => l.id).sort()).toEqual(['L3']);
  });

  it('includes the full predecessor chain when hovering the last task', () => {
    const p = partitionTaskArrowLinks(links, null, 'c');
    expect(p.hoveredTaskLinks.map((l) => l.id).sort()).toEqual(['L1', 'L2']);
    expect(p.regularLinks.map((l) => l.id)).toEqual(['L3']);
  });

  it('highlights only the direct later link when hovering the first task', () => {
    const p = partitionTaskArrowLinks(links, null, 'a');
    expect(p.hoveredTaskLinks.map((l) => l.id)).toEqual(['L1']);
    expect(p.regularLinks.map((l) => l.id).sort()).toEqual(['L2', 'L3']);
  });

  it('puts all in regular when no hover task', () => {
    const p = partitionTaskArrowLinks(links, null, null);
    expect(p.hoveredLink).toBeUndefined();
    expect(p.hoveredTaskLinks).toHaveLength(0);
    expect(p.regularLinks).toHaveLength(3);
  });
});
