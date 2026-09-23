import type { StickyNoteCardRowLayout } from '@/features/task/utils/stickyNoteCardRowResizeHelpers';
import type { Task, TaskPosition } from '@/types';

import { getPartsPerDay } from '@/constants';
import { isSwimlaneDiagramTask, parseSwimlaneCommentTaskId } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import {
  distributeIntervalsToLayers,
  placeSpannedLayerItems,
  swimlaneLayerItemsConflict,
} from '@/features/swimlane/utils/layerUtilsHelpers';
import { getOrderedPlanSegments } from '@/features/swimlane/utils/positionUtils';
import { resolveStickyNoteEffectiveCardRowLayout } from '@/features/task/utils/stickyNoteCardRowResizeHelpers';
import { isSwimlaneImageTask } from '@/features/task/utils/swimlaneImageTask';
import { DEFAULT_PLANNER_COMMENT_CARD_ROW_HEIGHT } from '@/lib/comments/plannerCommentCardRow';

interface TaskWithPosition {
  position: TaskPosition;
  task: Task;
}

interface SwimlaneTaskVerticalLayout {
  layerShiftUp: number;
  span: number;
}

function isQuickAddDraftTask(task: Task): boolean {
  return task.isLocalTask === true && parseSwimlaneCommentTaskId(task.id) == null;
}

function isSwimlaneStickyNoteTask(task: Pick<Task, 'id' | 'localDraftKind'>): boolean {
  if (isSwimlaneImageTask(task) || isSwimlaneDiagramTask(task)) {
    return false;
  }
  return task.localDraftKind === 'comment' || parseSwimlaneCommentTaskId(task.id) != null;
}

function resolveSwimlaneTaskVerticalLayout(
  task: Pick<Task, 'id' | 'localDraftKind'>,
  position: Pick<TaskPosition, 'duration'>,
  stickyNoteCardRowById?: ReadonlyMap<string, StickyNoteCardRowLayout>
): SwimlaneTaskVerticalLayout {
  if (isSwimlaneDiagramTask(task)) {
    return { span: Math.max(1, position.duration), layerShiftUp: 0 };
  }
  if (isSwimlaneImageTask(task)) {
    const override = stickyNoteCardRowById?.get(task.id);
    if (override) {
      return resolveStickyNoteEffectiveCardRowLayout(override);
    }
    return { span: DEFAULT_PLANNER_COMMENT_CARD_ROW_HEIGHT, layerShiftUp: 0 };
  }
  if (isSwimlaneStickyNoteTask(task)) {
    return resolveStickyNoteEffectiveCardRowLayout(stickyNoteCardRowById?.get(task.id));
  }
  return { span: 1, layerShiftUp: 0 };
}

export function resolveSwimlaneCardLayerSpan(
  task: Pick<Task, 'id' | 'localDraftKind'>,
  position: Pick<TaskPosition, 'duration'>,
  stickyNoteCardRowById?: ReadonlyMap<string, StickyNoteCardRowLayout>
): number {
  return resolveSwimlaneTaskVerticalLayout(task, position, stickyNoteCardRowById).span;
}

export function buildSwimlaneTaskVerticalLayoutById(
  tasksWithPositions: TaskWithPosition[],
  stickyNoteCardRowById?: ReadonlyMap<string, StickyNoteCardRowLayout>
): Map<string, SwimlaneTaskVerticalLayout> {
  const layoutById = new Map<string, SwimlaneTaskVerticalLayout>();
  for (const { task, position } of tasksWithPositions) {
    layoutById.set(
      task.id,
      resolveSwimlaneTaskVerticalLayout(task, position, stickyNoteCardRowById)
    );
  }
  return layoutById;
}

export function buildSwimlaneTaskLayerSpanById(
  tasksWithPositions: TaskWithPosition[],
  stickyNoteCardRowById?: ReadonlyMap<string, StickyNoteCardRowLayout>
): Map<string, number> {
  const spanById = new Map<string, number>();
  for (const { task, position } of tasksWithPositions) {
    spanById.set(task.id, resolveSwimlaneCardLayerSpan(task, position, stickyNoteCardRowById));
  }
  return spanById;
}

/**
 * Распределяет задачи по слоям для избежания визуального пересечения
 * (учитывает несколько отрезков занятости у одной задачи).
 * Черновик quick-add кладётся после уже лежащих карточек, чтобы занять
 * свободный слой (тот же слот, что и превью «+»), а не вытеснять их вверх.
 */
export function distributeTasksToLayers(
  tasksWithPositions: TaskWithPosition[],
  baselines: Array<{ end: number; start: number; taskId: string }> = [],
  stickyNoteCardRowById?: ReadonlyMap<string, StickyNoteCardRowLayout>
): Map<string, number> {
  const baselineByTaskId = new Map(baselines.map((baseline) => [baseline.taskId, baseline]));
  const items = tasksWithPositions.map(({ task, position }) => {
    const verticalLayout = resolveSwimlaneTaskVerticalLayout(task, position, stickyNoteCardRowById);
    return {
      id: task.id,
      position,
      baseline: baselineByTaskId.get(task.id) ?? null,
      isQuickAddDraft: isQuickAddDraftTask(task),
      layerShiftUp: verticalLayout.layerShiftUp,
      span: verticalLayout.span,
    };
  });
  items.sort((a, b) => Number(a.isQuickAddDraft) - Number(b.isQuickAddDraft));
  const placed = placeSpannedLayerItems(items, swimlaneLayerItemsConflict);

  const layerMap = new Map<string, number>();
  for (const { item, layer } of placed) {
    layerMap.set(item.id, layer);
  }
  return layerMap;
}

/**
 * Вычисляет бейзлайны (отклонения от плана) для задач — только от конца последнего сегмента при отставании.
 */
export function calculateBaselines(
  tasksWithPositions: TaskWithPosition[],
  currentCell: number
): Array<{ end: number, start: number; taskId: string; }> {
  const baselines: Array<{ end: number, start: number; taskId: string; }> = [];

  tasksWithPositions.forEach(({ task, position }) => {
    if (
      parseSwimlaneCommentTaskId(task.id) != null ||
      task.localDraftKind === 'comment' ||
      task.localDraftKind === 'diagram' ||
      task.localDraftKind === 'image' ||
      task.isLocalTask === true
    ) {
      return;
    }
    if (task.status !== 'in-progress' && task.status !== 'todo') return;
    const segments = getOrderedPlanSegments(position);
    const lastSegment = segments.at(-1);
    if (lastSegment == null) return;

    const startCell = lastSegment.startDay * getPartsPerDay() + lastSegment.startPart;
    const plannedEndCell = startCell + lastSegment.duration;
    if (plannedEndCell < currentCell) {
      baselines.push({
        taskId: task.id,
        start: plannedEndCell,
        end: currentCell,
      });
    }
  });

  return baselines;
}

/**
 * Распределяет бейзлайны по слоям
 */
export function distributeBaselinesToLayers(
  baselines: Array<{ end: number, start: number; taskId: string; }>
): Map<string, number> {
  const intervals = baselines.map((baseline) => ({
    id: baseline.taskId,
    start: baseline.start,
    end: baseline.end,
  }));

  const layers = distributeIntervalsToLayers(intervals);
  const layerMap = new Map<string, number>();

  layers.forEach((layer, layerIndex) => {
    layer.forEach(({ id }) => {
      layerMap.set(id, layerIndex);
    });
  });

  return layerMap;
}

