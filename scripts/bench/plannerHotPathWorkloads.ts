import type { PlannerHotPathSprint } from './plannerHotPathFixtures';

import {
  getOccupancyErrorReasons,
  getOverlappingTaskIds,
} from '@/features/sprint/utils/occupancyValidation';
import {
  buildPositionedTasksForDeveloper,
  computeSwimlaneLayoutDimensions,
  computeSwimlanePointTotals,
} from '@/features/swimlane/hooks/useSwimlaneLayoutHelpers';
import {
  buildSwimlaneTaskLayerSpanById,
  calculateBaselines,
  distributeBaselinesToLayers,
  distributeTasksToLayers,
} from '@/features/swimlane/utils/layerUtils';
import { buildSwimlaneOccupiedLayersByCell } from '@/features/swimlane/utils/swimlaneCellOccupancy';
import { buildSwimlaneSegmentArrowLinks } from '@/features/swimlane/utils/task-arrows/swimlaneSegmentArrowHelpers';
import { mergeTaskLinksWithDevQa } from '@/features/swimlane/utils/task-arrows/taskArrowsHelpers';
import { calculateCellFromMouse } from '@/lib/swimlane/swimlaneCellFromGeometry';

const DRAG_FRAMES = 120;
const OVERLAP_SAMPLE = 16;
const SWIMLANE_LEFT = 80;
const SWIMLANE_WIDTH = 1200;

function swimlaneRect(): DOMRect {
  return {
    bottom: 40,
    height: 40,
    left: SWIMLANE_LEFT,
    right: SWIMLANE_LEFT + SWIMLANE_WIDTH,
    toJSON: () => '',
    top: 0,
    width: SWIMLANE_WIDTH,
    x: SWIMLANE_LEFT,
    y: 0,
  } as DOMRect;
}

/**
 * Полный пересчёт layout каждой дорожки — то, что свимлейн делает после сдвига позиций.
 * Возвращает сумму слоёв, чтобы движок не выкинул работу.
 */
export function recomputeSwimlaneLayouts(sprint: PlannerHotPathSprint): number {
  let fingerprint = 0;
  for (const assigneeId of sprint.assigneeIds) {
    const positionedTasks = buildPositionedTasksForDeveloper(
      assigneeId,
      sprint.taskPositions,
      sprint.tasksMap
    );
    fingerprint += computeSwimlanePointTotals(positionedTasks).totalSP;
    const baselines = calculateBaselines(positionedTasks, sprint.currentCell);
    const taskLayerSpanById = buildSwimlaneTaskLayerSpanById(positionedTasks);
    const taskLayerMap = distributeTasksToLayers(positionedTasks, baselines);
    const baselineLayerMap = distributeBaselinesToLayers(baselines);
    fingerprint += buildSwimlaneOccupiedLayersByCell(
      positionedTasks.map(({ position }) => position),
      taskLayerMap,
      taskLayerSpanById,
      baselines
    ).size;
    fingerprint += computeSwimlaneLayoutDimensions({
      baselineLayerMap,
      showParent: false,
      taskLayerMap,
      taskLayerSpanById,
    }).maxTaskLayers;
  }
  return fingerprint;
}

export function occupancyErrorReasons(sprint: PlannerHotPathSprint): number {
  return getOccupancyErrorReasons(sprint.tasks, sprint.taskPositions).size;
}

export function overlappingIdsSample(sprint: PlannerHotPathSprint): number {
  const sample = sprint.tasks.slice(0, OVERLAP_SAMPLE);
  let total = 0;
  for (const task of sample) {
    total += getOverlappingTaskIds(task.id, sprint.tasks, sprint.taskPositions).size;
  }
  return total;
}

/** ~2 секунды жеста при 60 fps: перевод clientX → ячейка без DOM/dnd-kit. */
export function dragCellFromMouseBurst(sprint: PlannerHotPathSprint): number {
  const rect = swimlaneRect();
  let lastPart = 0;
  for (let frame = 0; frame < DRAG_FRAMES; frame++) {
    const mouseX = SWIMLANE_LEFT + (SWIMLANE_WIDTH * frame) / DRAG_FRAMES;
    const cell = calculateCellFromMouse(
      mouseX,
      rect,
      2,
      undefined,
      sprint.workingDaysCount
    );
    lastPart = cell?.part ?? 0;
  }
  return lastPart;
}

export function rebuildArrowLinks(sprint: PlannerHotPathSprint): number {
  const merged = mergeTaskLinksWithDevQa([], sprint.qaTasksMap, sprint.taskPositions);
  const segments = buildSwimlaneSegmentArrowLinks(sprint.taskPositions, {
    tasksMap: sprint.tasksMap,
    visibleDeveloperIds: new Set(sprint.assigneeIds),
  });
  return merged.length + segments.length;
}

export const PLANNER_HOT_PATH_WORKLOADS = {
  dragCellFromMouseBurst,
  occupancyErrorReasons,
  overlappingIdsSample,
  rebuildArrowLinks,
  recomputeSwimlaneLayouts,
} as const;

export type PlannerHotPathWorkloadName = keyof typeof PLANNER_HOT_PATH_WORKLOADS;
