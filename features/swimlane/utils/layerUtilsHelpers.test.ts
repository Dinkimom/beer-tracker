import type { TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import { calculateBaselines, distributeTasksToLayers, resolveSwimlaneCardLayerSpan } from './layerUtils';
import {
  swimlaneLayerItemsConflict,
  taskPositionConflictsWithBaseline,
  taskPositionsIntersectInTime,
} from './layerUtilsHelpers';

function position(
  taskId: string,
  startDay: number,
  startPart: number,
  duration: number,
  segments?: TaskPosition['segments']
): TaskPosition {
  return {
    assignee: 'dev',
    duration,
    segments,
    startDay,
    startPart,
    taskId,
  };
}

describe('taskPositionsIntersectInTime', () => {
  it('returns false for non-overlapping single-segment tasks', () => {
    const a = position('a', 0, 0, 2);
    const b = position('b', 0, 2, 2);
    expect(taskPositionsIntersectInTime(a, b)).toBe(false);
  });

  it('returns true for overlapping single-segment tasks', () => {
    const a = position('a', 0, 0, 3);
    const b = position('b', 0, 2, 2);
    expect(taskPositionsIntersectInTime(a, b)).toBe(true);
  });

  it('treats gaps in multi-segment tasks as occupied for layer placement', () => {
    const multi = position('multi', 0, 0, 1, [
      { startDay: 0, startPart: 0, duration: 2 },
      { startDay: 0, startPart: 4, duration: 2 },
    ]);
    const inGap = position('gap', 0, 2, 2);
    expect(taskPositionsIntersectInTime(multi, inGap)).toBe(true);
  });

  it('allows tasks after the multi-segment envelope', () => {
    const multi = position('multi', 0, 0, 1, [
      { startDay: 0, startPart: 0, duration: 2 },
      { startDay: 0, startPart: 4, duration: 2 },
    ]);
    const after = position('after', 0, 6, 2);
    expect(taskPositionsIntersectInTime(multi, after)).toBe(false);
  });
});

describe('taskPositionConflictsWithBaseline', () => {
  it('returns true when a card overlaps another task baseline', () => {
    const card = position('card', 0, 6, 2);
    const baseline = { start: 5, end: 10 };
    expect(taskPositionConflictsWithBaseline(card, baseline)).toBe(true);
  });

  it('returns false when a card starts where the baseline ends', () => {
    const card = position('card', 0, 10, 2);
    const baseline = { start: 5, end: 10 };
    expect(taskPositionConflictsWithBaseline(card, baseline)).toBe(false);
  });

  it('treats multi-segment gaps as conflicting with a baseline inside the envelope', () => {
    const multi = position('multi', 0, 0, 1, [
      { startDay: 0, startPart: 0, duration: 2 },
      { startDay: 0, startPart: 4, duration: 2 },
    ]);
    const baseline = { start: 2, end: 4 };
    expect(taskPositionConflictsWithBaseline(multi, baseline)).toBe(true);
  });
});

describe('swimlaneLayerItemsConflict', () => {
  it('conflicts when one card overlaps the other task baseline', () => {
    expect(
      swimlaneLayerItemsConflict(
        {
          position: position('overdue', 0, 0, 5),
          baseline: { start: 5, end: 10 },
        },
        {
          position: position('other', 0, 6, 2),
          baseline: null,
        }
      )
    ).toBe(true);
  });
});

describe('distributeTasksToLayers', () => {
  it('puts a task in a multi-segment gap on a separate layer', () => {
    const tasks = [
      {
        task: { id: 'multi' } as never,
        position: position('multi', 0, 0, 1, [
          { startDay: 0, startPart: 0, duration: 2 },
          { startDay: 0, startPart: 4, duration: 2 },
        ]),
      },
      {
        task: { id: 'gap' } as never,
        position: position('gap', 0, 2, 2),
      },
    ];

    const layerMap = distributeTasksToLayers(tasks);
    expect(layerMap.get('multi')).toBe(0);
    expect(layerMap.get('gap')).toBe(1);
  });

  it('puts a card overlapping another task baseline on a separate layer', () => {
    const tasks = [
      {
        task: { id: 'overdue', status: 'todo' } as never,
        position: position('overdue', 0, 0, 5),
      },
      {
        task: { id: 'other', status: 'todo' } as never,
        position: position('other', 0, 6, 2),
      },
    ];
    const baselines = [{ taskId: 'overdue', start: 5, end: 10 }];

    const layerMap = distributeTasksToLayers(tasks, baselines);
    expect(layerMap.get('overdue')).toBe(0);
    expect(layerMap.get('other')).toBe(1);
  });

  it('keeps non-overlapping cards on one layer when baselines are omitted (board mode)', () => {
    const tasks = [
      {
        task: { id: 'overdue', status: 'todo' } as never,
        position: position('overdue', 0, 0, 5),
      },
      {
        task: { id: 'other', status: 'todo' } as never,
        position: position('other', 0, 6, 2),
      },
    ];

    const layerMap = distributeTasksToLayers(tasks, []);
    expect(layerMap.get('overdue')).toBe(0);
    expect(layerMap.get('other')).toBe(0);
  });

  it('keeps quick-add draft preview on the same layer as non-overlapping tasks after it', () => {
    const tasks = [
      {
        task: { id: 'local-task-draft', isLocalTask: true, localDraftKind: 'task', status: 'todo' } as never,
        position: position('local-task-draft', 0, 5, 1),
      },
      {
        task: { id: 'after', status: 'todo' } as never,
        position: position('after', 0, 8, 2),
      },
    ];
    const baselines = calculateBaselines(tasks, 20);

    expect(baselines.some((baseline) => baseline.taskId === 'local-task-draft')).toBe(false);
    const layerMap = distributeTasksToLayers(tasks, baselines);
    expect(layerMap.get('local-task-draft')).toBe(0);
    expect(layerMap.get('after')).toBe(0);
  });

  it('places an overlapping card below a multi-slot photo instead of covering it', () => {
    const tasks = [
      {
        task: { id: 'local-image:1', localDraftKind: 'image', status: 'todo' } as never,
        position: position('local-image:1', 0, 0, 2),
      },
      {
        task: { id: 'comment:1', localDraftKind: 'comment', status: 'todo' } as never,
        position: position('comment:1', 0, 1, 6),
      },
    ];

    const layerMap = distributeTasksToLayers(tasks);
    expect(layerMap.get('local-image:1')).toBe(0);
    expect(layerMap.get('comment:1')).toBe(2);
  });

  it('stacks a note below a photo that already sits under another card', () => {
    const tasks = [
      {
        task: { id: 'green', status: 'todo' } as never,
        position: position('green', 0, 0, 1),
      },
      {
        task: { id: 'local-image:1', localDraftKind: 'image', status: 'todo' } as never,
        position: position('local-image:1', 0, 0, 2),
      },
      {
        task: { id: 'comment:1', localDraftKind: 'comment', status: 'todo' } as never,
        position: position('comment:1', 0, 0, 6),
      },
    ];

    const layerMap = distributeTasksToLayers(tasks);
    expect(layerMap.get('green')).toBe(0);
    expect(layerMap.get('local-image:1')).toBe(1);
    expect(layerMap.get('comment:1')).toBe(3);
  });

  it('keeps a photo on the same layer as a non-overlapping card', () => {
    const tasks = [
      {
        task: { id: 'local-image:1', localDraftKind: 'image', status: 'todo' } as never,
        position: position('local-image:1', 0, 0, 2),
      },
      {
        task: { id: 'after', status: 'todo' } as never,
        position: position('after', 0, 2, 1),
      },
    ];

    const layerMap = distributeTasksToLayers(tasks);
    expect(layerMap.get('local-image:1')).toBe(0);
    expect(layerMap.get('after')).toBe(0);
  });

  it('places an overlapping quick-add draft in the free layer under the existing card', () => {
    const tasks = [
      {
        task: {
          id: 'local-task-draft',
          isLocalTask: true,
          localDraftKind: 'task',
          status: 'todo',
        } as never,
        position: position('local-task-draft', 0, 1, 1),
      },
      {
        task: { id: 'existing', status: 'todo' } as never,
        position: position('existing', 0, 0, 3),
      },
    ];

    const layerMap = distributeTasksToLayers(tasks);
    expect(layerMap.get('existing')).toBe(0);
    expect(layerMap.get('local-task-draft')).toBe(1);
  });

  it('pushes overlapping tasks when sticky-note spans multiple card rows', () => {
    const tasks = [
      {
        task: { id: 'comment:n1', localDraftKind: 'comment' } as never,
        position: position('comment:n1', 0, 0, 2),
      },
      {
        task: { id: 'QUEUE-1', localDraftKind: 'task' } as never,
        position: position('QUEUE-1', 0, 0, 2),
      },
    ];
    const stickyNoteCardRowById = new Map([['comment:n1', { layerShiftUp: 0, span: 2 }]]);

    const layerMap = distributeTasksToLayers(tasks, [], stickyNoteCardRowById);
    expect(layerMap.get('comment:n1')).toBe(0);
    expect(layerMap.get('QUEUE-1')).toBe(2);
  });
});

describe('resolveSwimlaneCardLayerSpan', () => {
  it('grows diagram cards with duration so the frame stays square', () => {
    expect(
      resolveSwimlaneCardLayerSpan({ id: 'comment:d1', localDraftKind: 'diagram' }, { duration: 2 })
    ).toBe(2);
  });

  it('keeps photo card height independent of duration', () => {
    expect(
      resolveSwimlaneCardLayerSpan({ id: 'local-image:1', localDraftKind: 'image' }, { duration: 3 })
    ).toBe(2);
  });

  it('uses local vertical override for photo cards when present', () => {
    const stickyNoteCardRowById = new Map([['local-image:1', { layerShiftUp: 0, span: 3 }]]);
    expect(
      resolveSwimlaneCardLayerSpan(
        { id: 'local-image:1', localDraftKind: 'image' },
        { duration: 1 },
        stickyNoteCardRowById
      )
    ).toBe(3);
  });

  it('keeps ordinary tasks one layer tall', () => {
    expect(
      resolveSwimlaneCardLayerSpan({ id: 'QUEUE-1', localDraftKind: 'task' }, { duration: 4 })
    ).toBe(1);
  });
});

describe('distributeTasksToLayers with manual layers', () => {
  const card = (id: string, startPart: number, duration: number) => ({
    task: { id, status: 'todo' } as never,
    position: position(id, 0, startPart, duration),
  });

  it('keeps each card on its manual layer instead of floating up', () => {
    const layerMap = distributeTasksToLayers([card('a', 0, 2), card('b', 4, 2)], [], undefined, new Map([
      ['a', { layer: 1, rev: 1 }],
      ['b', { layer: 0, rev: 1 }],
    ]));
    expect(layerMap.get('a')).toBe(1);
    expect(layerMap.get('b')).toBe(0);
  });

  it('keeps the most recently edited card in place and pushes the overlapping one down', () => {
    const tasks = [card('old', 0, 3), card('moved', 1, 2)];
    const layerMap = distributeTasksToLayers(tasks, [], undefined, new Map([
      ['moved', { layer: 0, rev: 2 }],
      ['old', { layer: 0, rev: 1 }],
    ]));
    expect(layerMap.get('moved')).toBe(0);
    expect(layerMap.get('old')).toBe(1);
  });

  it('cascades the push so cards below keep their order', () => {
    // «note» растянули на 2 ряда: «b» под ней и «c» под «b» уезжают вниз по очереди.
    const tasks = [card('comment:note', 0, 2), card('b', 0, 2), card('c', 0, 2)];
    const layerMap = distributeTasksToLayers(
      tasks,
      [],
      new Map([['comment:note', { layerShiftUp: 0, span: 2 }]]),
      new Map([
        ['b', { layer: 1, rev: 1 }],
        ['c', { layer: 2, rev: 1 }],
        ['comment:note', { layer: 0, rev: 5 }],
      ])
    );
    expect(layerMap.get('comment:note')).toBe(0);
    expect(layerMap.get('b')).toBe(2);
    expect(layerMap.get('c')).toBe(3);
  });

  it('packs cards without a manual layer into the gaps around manual ones', () => {
    const layerMap = distributeTasksToLayers([card('auto', 0, 2), card('pinned', 0, 2)], [], undefined, new Map([
      ['pinned', { layer: 0, rev: 1 }],
    ]));
    expect(layerMap.get('pinned')).toBe(0);
    expect(layerMap.get('auto')).toBe(1);
  });

  it('places a newly seen card into the free gap instead of pushing earlier-seen ones', () => {
    // Без порядка появления «new» (раньше по старту) забрала бы слой 0 у «late».
    const tasks = [card('new', 1, 2), card('late', 2, 2)];
    expect(distributeTasksToLayers(tasks).get('late')).toBe(1);
    const seen = new Map([['late', 0]]);
    const layerMap = distributeTasksToLayers(tasks, [], undefined, undefined, seen);
    expect(layerMap.get('late')).toBe(0);
    expect(layerMap.get('new')).toBe(1);
  });
});

describe('collapsing empty rows', () => {
  const card = (id: string, startPart: number, duration: number) => ({
    task: { id, status: 'todo' } as never,
    position: position(id, 0, startPart, duration),
  });

  it('lifts cards once a whole row in between is empty', () => {
    const layerMap = distributeTasksToLayers([card('a', 0, 2), card('b', 0, 2)], [], undefined, new Map([
      ['a', { layer: 0, rev: 1 }],
      ['b', { layer: 3, rev: 1 }],
    ]));
    expect(layerMap.get('b')).toBe(1);
  });

  it('keeps a card below a row that still has another card in it', () => {
    const layerMap = distributeTasksToLayers([card('a', 0, 2), card('top-right', 6, 2), card('b', 1, 2)], [], undefined, new Map([
      ['a', { layer: 1, rev: 1 }],
      ['top-right', { layer: 0, rev: 1 }],
      ['b', { layer: 2, rev: 1 }],
    ]));
    expect(layerMap.get('top-right')).toBe(0);
    expect(layerMap.get('a')).toBe(1);
    expect(layerMap.get('b')).toBe(2);
  });
});
