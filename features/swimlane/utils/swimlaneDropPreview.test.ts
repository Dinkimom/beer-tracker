import type { SwimlaneBaselineLayoutMode } from '@/lib/swimlane/swimlaneBaselineLayoutMode';
import type { Task, TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import { getPartsPerDay } from '@/constants';
import { positionToStartCell } from '@/lib/planner-timeline';
import { resolveSwimlaneBaselinesForLayerPacking } from '@/lib/swimlane/swimlaneBaselineLayoutMode';

import { buildSwimlaneTaskVerticalLayoutById, calculateBaselines, distributeTasksToLayers } from './layerUtils';
import {
  buildSwimlaneDropPreviewLaneModel,
  resolveSwimlaneDropPreviewSlot,
} from './swimlaneDropPreview';

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
  baselineLayoutMode?: SwimlaneBaselineLayoutMode;
  currentCell?: number;
  durationCells: number;
  lane?: ReturnType<typeof buildSwimlaneDropPreviewLaneModel>;
  laneTasks: LaneTask[];
  startCell: number;
  taskPositions: Map<string, TaskPosition>;
}) {
  const lane =
    input.lane ??
    buildSwimlaneDropPreviewLaneModel({
      activeTaskId: input.activeTask.id,
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
        part: input.startCell % getPartsPerDay(),
      },
    },
    taskPositions: input.taskPositions,
    totalCells: TOTAL_CELLS,
  });
}

/** Полная раскладка строки после drop — эталон, с которым сверяется инкрементальный расчёт. */
function layerAfterFullRelayout(input: {
  activeTask: Task;
  baselineLayoutMode: SwimlaneBaselineLayoutMode;
  currentCell: number;
  duration: number;
  laneTasks: LaneTask[];
  startCell: number;
}): number | undefined {
  const dropped = { task: input.activeTask, position: position(input.activeTask.id, 'dev-b', input.startCell, input.duration) };
  const afterDrop = [
    ...input.laneTasks.filter(({ task: t }) => t.id !== input.activeTask.id),
    dropped,
  ].sort((a, b) => positionToStartCell(a.position) - positionToStartCell(b.position));
  const baselines = resolveSwimlaneBaselinesForLayerPacking(
    calculateBaselines(afterDrop, input.currentCell),
    input.baselineLayoutMode
  );
  const layer = distributeTasksToLayers(afterDrop, baselines).get(input.activeTask.id);
  const shift = buildSwimlaneTaskVerticalLayoutById([dropped]).get(input.activeTask.id)?.layerShiftUp ?? 0;
  return layer == null ? undefined : Math.max(0, layer - shift);
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
    expect(slot).toEqual({ durationCells: 2, layer: 0, span: 1, startCell: 4 });
  });

  it('stacks below a card that overlaps the target range', () => {
    const laneTasks = [{ task: task('b'), position: position('b', 'dev-b', 0, 4) }];
    const slot = resolve({
      activeTask: task('a'),
      durationCells: 2,
      laneTasks,
      startCell: 2,
      taskPositions: positionsOf(laneTasks, ['a', position('a', 'dev-a', 0, 2)]),
    });
    expect(slot?.layer).toBe(1);
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

  it('returns null when the card would not fit before the sprint end', () => {
    const slot = resolve({
      activeTask: task('a'),
      durationCells: 3,
      laneTasks: [],
      startCell: TOTAL_CELLS - 1,
      taskPositions: new Map([['a', position('a', 'dev-a', 0, 3)]]),
    });
    expect(slot).toBeNull();
  });

  it('returns null for a multi-segment task dropped on another lane', () => {
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
    'matches a full relayout for every cell of random dense lanes (%s baselines)',
    (baselineLayoutMode, currentCell) => {
      for (let seed = 1; seed <= 12; seed++) {
        const laneTasks = randomLane(seed, 30);
        const active = task(`active-${seed}`, { status: 'in-progress' });
        const taskPositions = positionsOf(laneTasks, [active.id, position(active.id, 'dev-a', 0, 3)]);
        const lane = buildSwimlaneDropPreviewLaneModel({
          activeTaskId: active.id,
          baselineLayoutMode,
          currentCell,
          laneTasks,
        });
        for (let start = 0; start <= TOTAL_CELLS - 3; start++) {
          const slot = resolve({ activeTask: active, durationCells: 3, lane, laneTasks, startCell: start, taskPositions });
          expect(slot?.layer).toBe(
            layerAfterFullRelayout({ activeTask: active, baselineLayoutMode, currentCell, duration: 3, laneTasks, startCell: start })
          );
        }
      }
    }
  );

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
