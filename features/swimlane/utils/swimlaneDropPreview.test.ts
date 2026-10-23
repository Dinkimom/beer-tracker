import type { SwimlaneBaselineLayoutMode } from '@/lib/swimlane/swimlaneBaselineLayoutMode';
import type { Task, TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import { getPartsPerDay } from '@/constants';
import { positionToStartCell } from '@/lib/planner-timeline';
import { resolveSwimlaneBaselinesForLayerPacking } from '@/lib/swimlane/swimlaneBaselineLayoutMode';

import {
  buildSwimlaneLayerPackingItems,
  calculateBaselines,
  distributeTasksToLayers,
  placeSwimlaneLayerItems,
} from './layerUtils';
import {
  buildSwimlaneDropPreviewLaneModel,
  resolveSwimlaneDropPreviewSlot,
} from './swimlaneDropPreview';
import { resolveSwimlaneCardDropInLane } from './swimlaneLaneLayoutRegistry';

const TOTAL_CELLS = 10 * getPartsPerDay();

interface LaneTask {
  position: TaskPosition;
  task: Task;
}

function task(id: string, extra: Partial<Task> = {}): Task {
  return {
    id,
    link: '',
    name: id,
    status: 'todo',
    storyPoints: 1,
    team: 'Back',
    ...extra,
  };
}

function position(taskId: string, assignee: string, startCell: number, duration: number): TaskPosition {
  return {
    assignee,
    duration,
    startDay: Math.floor(startCell / getPartsPerDay()),
    startPart: startCell % getPartsPerDay(),
    taskId,
  };
}

function resolve(input: {
  activeDraggableId?: string;
  activeTask: Task;
  autoArrange?: boolean;
  baselineLayoutMode?: SwimlaneBaselineLayoutMode;
  currentCell?: number;
  durationCells: number;
  lane?: ReturnType<typeof buildSwimlaneDropPreviewLaneModel>;
  laneTasks: LaneTask[];
  startCell: number;
  targetTopLayer?: number;
  taskPositions: Map<string, TaskPosition>;
}) {
  const lane =
    input.lane ??
    buildSwimlaneDropPreviewLaneModel({
      activeTaskId: input.activeTask.id,
      autoArrange: input.autoArrange ?? true,
      baselineLayoutMode: input.baselineLayoutMode ?? 'compact',
      currentCell: input.currentCell ?? 0,
      laneTasks: input.laneTasks,
    });
  return resolveSwimlaneDropPreviewSlot({
    lane,
    target: {
      activeDraggableId: input.activeDraggableId ?? input.activeTask.id,
      activeTask: input.activeTask,
      durationCells: input.durationCells,
      hoveredCell: {
        assigneeId: 'dev-b',
        day: Math.floor(input.startCell / getPartsPerDay()),
        layer: input.targetTopLayer,
        part: input.startCell % getPartsPerDay(),
      },
    },
    taskPositions: input.taskPositions,
    totalCells: TOTAL_CELLS,
  });
}

/**
 * Раскладка строки после drop, когда drag-end записал слои всей строки ручными.
 * Эталон для превью: доска должна показать карточку там же, где превью.
 */
function layoutAfterDrop(input: {
  activeTask: Task;
  baselineLayoutMode: SwimlaneBaselineLayoutMode;
  currentCell: number;
  duration: number;
  lanePlaced: ReturnType<typeof placeSwimlaneLayerItems>;
  laneTasks: LaneTask[];
  startCell: number;
  targetTopLayer: number;
}): Map<string, number> {
  const dropped = { task: input.activeTask, position: position(input.activeTask.id, 'dev-b', input.startCell, input.duration) };
  const afterDrop = [...input.laneTasks, dropped];
  const baselines = resolveSwimlaneBaselinesForLayerPacking(
    calculateBaselines(afterDrop, input.currentCell),
    input.baselineLayoutMode
  );
  const [item] = buildSwimlaneLayerPackingItems(
    [dropped],
    resolveSwimlaneBaselinesForLayerPacking(calculateBaselines([dropped], input.currentCell), input.baselineLayoutMode)
  );
  const { writes } = resolveSwimlaneCardDropInLane({
    cardId: input.activeTask.id,
    item,
    placed: input.lanePlaced,
    position: dropped.position,
    targetTopLayer: input.targetTopLayer,
  });
  const manual = new Map(writes.map(({ cardId, layer }, index) => [cardId, { layer: layer ?? 0, rev: index }]));
  return distributeTasksToLayers(afterDrop, baselines, undefined, manual);
}

function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
}

function randomLane(seed: number, count: number): LaneTask[] {
  const random = seededRandom(seed);
  return Array.from({ length: count }, (_, i) => {
    const id = `t${seed}-${i}`;
    const roll = random();
    let extra: Partial<Task> = {};
    if (roll < 0.1) extra = { id: `comment:${id}`, localDraftKind: 'comment' };
    else if (roll < 0.15) extra = { id: `local-image:${id}`, localDraftKind: 'image' };
    else if (roll < 0.2) extra = { isLocalTask: true, localDraftKind: 'task' };
    else if (roll < 0.4) extra = { status: 'in-progress' };
    const t = task(extra.id ?? id, extra);
    const duration = 1 + Math.floor(random() * 5);
    const start = Math.floor(random() * (TOTAL_CELLS - duration));
    return { task: t, position: position(t.id, 'dev-b', start, duration) };
  });
}

function positionsOf(laneTasks: LaneTask[], active: [string, TaskPosition]) {
  return new Map<string, TaskPosition>([
    active,
    ...laneTasks.map(({ position: p }) => [p.taskId, p] as const),
  ]);
}

describe('resolveSwimlaneDropPreviewSlot', () => {
  it('lands on the first layer when the target range is free', () => {
    const otherPos = position('b', 'dev-b', 0, 2);
    const laneTasks = [{ task: task('b'), position: otherPos }];
    const slot = resolve({
      activeTask: task('a'),
      durationCells: 2,
      laneTasks,
      startCell: 4,
      taskPositions: positionsOf(laneTasks, ['a', position('a', 'dev-a', 0, 2)]),
    });
    expect(slot).toEqual({ durationCells: 2, layer: 0, pushesCards: false, span: 1, startCell: 4 });
  });

  it('auto-arrange: on equal start follows the position map order, not «new goes last»', () => {
    const note = { task: task('comment:n', { localDraftKind: 'comment' }), position: position('comment:n', 'dev-b', 4, 2) };
    const active = task('a');
    // «a» в карте позиций раньше заметки (задачи идут до заметок) — значит, и в укладке раньше.
    const taskPositions = new Map<string, TaskPosition>([
      ['a', position('a', 'dev-b', 0, 2)],
      ['comment:n', note.position],
    ]);
    const slot = resolve({ activeTask: active, durationCells: 2, laneTasks: [note], startCell: 4, taskPositions });
    expect(slot?.layer).toBe(0);
  });

  it('stacks below an overlapping card with auto-arrange', () => {
    const laneTasks = [{ task: task('b'), position: position('b', 'dev-b', 0, 4) }];
    const slot = resolve({
      activeTask: task('a'),
      durationCells: 2,
      laneTasks,
      startCell: 2,
      targetTopLayer: 0,
      taskPositions: positionsOf(laneTasks, ['a', position('a', 'dev-a', 0, 2)]),
    });
    expect(slot?.layer).toBe(1);
    expect(slot?.pushesCards).toBe(false);
  });

  it('manual: takes the hovered layer of an overlapping card (the card moves down)', () => {
    const laneTasks = [{ task: task('b'), position: position('b', 'dev-b', 0, 4) }];
    const slot = resolve({
      activeTask: task('a'),
      autoArrange: false,
      durationCells: 2,
      laneTasks,
      startCell: 2,
      taskPositions: positionsOf(laneTasks, ['a', position('a', 'dev-a', 0, 2)]),
    });
    expect(slot?.layer).toBe(0);
    expect(slot?.pushesCards).toBe(true);
  });

  it('manual: drops below an overlapping card when aimed under it', () => {
    const laneTasks = [{ task: task('b'), position: position('b', 'dev-b', 0, 4) }];
    const slot = resolve({
      activeTask: task('a'),
      autoArrange: false,
      durationCells: 2,
      laneTasks,
      startCell: 2,
      targetTopLayer: 3,
      taskPositions: positionsOf(laneTasks, ['a', position('a', 'dev-a', 0, 2)]),
    });
    expect(slot?.layer).toBe(1);
    expect(slot?.pushesCards).toBe(false);
  });

  it('ignores the dragged card own slot when moving inside its lane', () => {
    const active = task('a');
    const activePos = position('a', 'dev-b', 0, 3);
    const slot = resolve({
      activeTask: active,
      durationCells: 3,
      laneTasks: [{ task: active, position: activePos }],
      startCell: 1,
      taskPositions: new Map([['a', activePos]]),
    });
    expect(slot?.layer).toBe(0);
  });

  it('clamps preview start so a wide card still fits before the sprint end', () => {
    const slot = resolve({
      activeTask: task('a'),
      durationCells: 3,
      laneTasks: [],
      startCell: TOTAL_CELLS - 1,
      taskPositions: new Map([['a', position('a', 'dev-a', 0, 3)]]),
    });
    expect(slot).toEqual({
      durationCells: 3,
      layer: 0,
      pushesCards: false,
      span: 1,
      startCell: TOTAL_CELLS - 3,
    });
  });

  it('hides preview for a multi-segment task aimed at another lane', () => {
    const activePos: TaskPosition = {
      ...position('split', 'dev-a', 0, 2),
      segments: [
        { duration: 1, startDay: 0, startPart: 0 },
        { duration: 1, startDay: 1, startPart: 0 },
      ],
    };
    const slot = resolve({
      activeDraggableId: 'split::1',
      activeTask: task('split'),
      durationCells: 1,
      laneTasks: [],
      startCell: 3,
      taskPositions: new Map([['split', activePos]]),
    });
    expect(slot).toBeNull();
  });

  it.each([
    ['compact', 0],
    ['noOverlap', 18],
  ] as const)(
    'auto-arrange: matches a full relayout for every cell of random dense lanes (%s baselines)',
    (baselineLayoutMode, currentCell) => {
      for (let seed = 1; seed <= 12; seed++) {
        const laneTasks = randomLane(seed, 30);
        const active = task(`active-${seed}`, { status: 'in-progress' });
        const taskPositions = positionsOf(laneTasks, [active.id, position(active.id, 'dev-a', 0, 3)]);
        const lane = buildSwimlaneDropPreviewLaneModel({
          activeTaskId: active.id,
          autoArrange: true,
          baselineLayoutMode,
          currentCell,
          laneTasks,
        });
        for (let start = 0; start <= TOTAL_CELLS - 3; start++) {
          const slot = resolve({ activeTask: active, durationCells: 3, lane, laneTasks, startCell: start, taskPositions });
          const dropped = { task: active, position: position(active.id, 'dev-b', start, 3) };
          // Как на доске: порядок ключей карты позиций, затем стабильная сортировка по старту.
          const byId = new Map([...laneTasks, dropped].map((entry) => [entry.task.id, entry]));
          const afterDrop = [...taskPositions.keys()]
            .map((id) => byId.get(id))
            .filter((entry): entry is LaneTask => entry != null)
            .sort((a, b) => positionToStartCell(a.position) - positionToStartCell(b.position));
          const baselines = resolveSwimlaneBaselinesForLayerPacking(
            calculateBaselines(afterDrop, currentCell),
            baselineLayoutMode
          );
          expect(slot?.layer).toBe(distributeTasksToLayers(afterDrop, baselines).get(active.id));
        }
      }
    }
  );

  it.each([
    ['compact', 0],
    ['noOverlap', 18],
  ] as const)(
    'manual: matches the board after drop for every cell and target layer of random dense lanes (%s baselines)',
    (baselineLayoutMode, currentCell) => {
      for (let seed = 1; seed <= 6; seed++) {
        const laneTasks = randomLane(seed, 30);
        const active = task(`active-${seed}`, { status: 'in-progress' });
        const taskPositions = positionsOf(laneTasks, [active.id, position(active.id, 'dev-a', 0, 3)]);
        const lanePlaced = placeSwimlaneLayerItems(
          laneTasks,
          resolveSwimlaneBaselinesForLayerPacking(calculateBaselines(laneTasks, currentCell), baselineLayoutMode)
        );
        const lane = buildSwimlaneDropPreviewLaneModel({
          activeTaskId: active.id,
          baselineLayoutMode,
          currentCell,
          laneTasks,
          placed: lanePlaced,
        });
        for (let start = 0; start <= TOTAL_CELLS - 3; start += 3) {
          for (const targetTopLayer of [0, 0.5, 2, 2.5, 5]) {
            const slot = resolve({ activeTask: active, durationCells: 3, lane, laneTasks, startCell: start, targetTopLayer, taskPositions });
            expect(slot).not.toBeNull();
            // Нижняя половина ряда — под соседом: не дальше следующего ряда.
            expect(slot!.layer).toBeLessThanOrEqual(Math.floor(targetTopLayer) + 1);
            const after = layoutAfterDrop({
              activeTask: active,
              baselineLayoutMode,
              currentCell,
              duration: 3,
              lanePlaced,
              laneTasks,
              startCell: start,
              targetTopLayer,
            });
            expect(after.get(active.id)).toBe(slot!.layer);
          }
        }
      }
    }
  );

  it('uses the layout the board already shows, including manual layers', () => {
    const laneTasks = [
      { task: task('b'), position: position('b', 'dev-b', 0, 4) },
      { task: task('c'), position: position('c', 'dev-b', 0, 4) },
    ];
    // Вручную «c» на слое 0, «b» на слое 2: пустой слой 1 схлопнут, «a» встаёт между ними.
    const placed = placeSwimlaneLayerItems(laneTasks, [], undefined, new Map([
      ['b', { layer: 2, rev: 0 }],
      ['c', { layer: 0, rev: 0 }],
    ]));
    const lane = buildSwimlaneDropPreviewLaneModel({
      activeTaskId: 'a',
      baselineLayoutMode: 'compact',
      currentCell: 0,
      laneTasks,
      placed,
    });
    const slot = resolve({
      activeTask: task('a'),
      durationCells: 2,
      lane,
      laneTasks,
      startCell: 1,
      targetTopLayer: 1,
      taskPositions: positionsOf(laneTasks, ['a', position('a', 'dev-a', 0, 2)]),
    });
    expect(slot?.layer).toBe(1);
  });

  describe('load', () => {
    const CARDS = 200;
    const laneTasks = randomLane(42, CARDS);
    const active = task('active');
    const taskPositions = positionsOf(laneTasks, ['active', position('active', 'dev-a', 0, 2)]);

    it('builds the lane model for 200 cards once within budget', () => {
      const started = performance.now();
      const RUNS = 10;
      for (let run = 0; run < RUNS; run++) {
        buildSwimlaneDropPreviewLaneModel({
          activeTaskId: 'active',
          baselineLayoutMode: 'noOverlap',
          currentCell: 18,
          laneTasks,
        });
      }
      expect((performance.now() - started) / RUNS).toBeLessThan(50);
    });

    it('resolves a hovered cell on a 200-card lane well under one frame', () => {
      const lane = buildSwimlaneDropPreviewLaneModel({
        activeTaskId: 'active',
        baselineLayoutMode: 'noOverlap',
        currentCell: 18,
        laneTasks,
      });
      const SWEEPS = 20;
      let resolved = 0;
      const started = performance.now();
      for (let sweep = 0; sweep < SWEEPS; sweep++) {
        for (let start = 0; start <= TOTAL_CELLS - 2; start++) {
          if (resolve({ activeTask: active, durationCells: 2, lane, laneTasks, startCell: start, taskPositions })) {
            resolved++;
          }
        }
      }
      const perCellMs = (performance.now() - started) / (SWEEPS * (TOTAL_CELLS - 1));

      expect(resolved).toBe(SWEEPS * (TOTAL_CELLS - 1));
      expect(perCellMs).toBeLessThan(1);
    });
  });
});
