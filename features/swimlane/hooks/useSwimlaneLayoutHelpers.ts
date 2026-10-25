import type { StickyNoteCardRowLayout } from '@/features/task/utils/stickyNoteCardRowResizeHelpers';
import type { SprintPresenceGestureCardRow, SprintPresenceGestureNote } from '@/lib/realtime/sprintRealtimeTypes';
import type { SprintTaskCompletionRules } from '@/lib/sprints/sprintTaskCompletion';
import type { Task, TaskPosition } from '@/types';

import { getPartsPerDay } from '@/constants';
import { isSwimlaneCommentTaskId } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { resolveSwimlaneOneCardHeightPx } from '@/features/swimlane/utils/swimlaneRowReservedLayers';
import {
  resolveSwimlaneStackedTaskBandHeightPx,
  SWIMLANE_TASK_ROW_VERTICAL_INSET_PX,
} from '@/features/swimlane/utils/taskLayerTaskLayout';
import { applyTaskResizePreviewToPositionedTasks } from '@/features/task/hooks/useTaskResizeHelpers';
import { isStickyNoteColor } from '@/lib/comments/stickyNoteColor';
import { positionToStartCell } from '@/lib/planner-timeline';
import {
  collectOriginalTaskIds,
  getTaskStoryPoints,
  getTaskTestPointsInList,
  shouldCountTaskForParticipantVolume,
} from '@/lib/pointsUtils';
import { isTaskCompleted } from '@/lib/sprints/sprintTaskCompletion';

function resolveMaxOccupiedTaskLayers(
  taskLayerMap: Map<string, number>,
  taskVerticalLayoutById?: Map<string, { layerShiftUp: number; span: number }>
): { hasTaskOverlaps: boolean; maxTaskLayers: number } {
  let maxStartLayer = -1;
  let maxOccupied = 0;
  for (const [id, layer] of taskLayerMap) {
    if (layer > maxStartLayer) {
      maxStartLayer = layer;
    }
    const layout = taskVerticalLayoutById?.get(id) ?? { span: 1, layerShiftUp: 0 };
    const occupied = layer - layout.layerShiftUp + layout.span;
    if (occupied > maxOccupied) {
      maxOccupied = occupied;
    }
  }
  return {
    hasTaskOverlaps: maxStartLayer > 0,
    maxTaskLayers: Math.max(1, maxOccupied),
  };
}

export function buildPositionedTasksForDeveloper(
  developerId: string,
  taskPositions: Map<string, TaskPosition>,
  tasksMap: Map<string, Task>
): Array<{ task: Task; position: TaskPosition }> {
  const positionedTasks: Array<{ task: Task; position: TaskPosition }> = [];
  taskPositions.forEach((position, taskId) => {
    if (position.assignee !== developerId) return;
    const task = tasksMap.get(taskId);
    if (!task) return;
    positionedTasks.push({ task, position });
  });
  positionedTasks.sort(
    (a, b) => positionToStartCell(a.position) - positionToStartCell(b.position)
  );
  return positionedTasks;
}

interface RemotePresencePositionPreview {
  assignee?: string;
  duration: number;
  note?: SprintPresenceGestureNote;
  startCell: number | null;
  taskId: string;
}

function canSynthesizeRemotePresenceCard(preview: RemotePresencePositionPreview): boolean {
  return Boolean(preview.note) || isSwimlaneCommentTaskId(preview.taskId);
}

function synthesizeRemotePresenceNoteTask(
  taskId: string,
  note?: SprintPresenceGestureNote
): Task {
  return {
    id: taskId,
    link: '',
    localDraftKind: 'comment',
    name: note?.text ?? '',
    status: 'todo',
    stickyNoteColor: note?.color && isStickyNoteColor(note.color) ? note.color : 'yellow',
    storyPoints: 0,
    team: 'Back',
  };
}

function synthesizeRemotePresencePosition(
  preview: RemotePresencePositionPreview,
  developerId: string
): TaskPosition | null {
  if (preview.startCell == null) {
    return null;
  }
  return {
    assignee: preview.assignee ?? developerId,
    duration: preview.duration,
    startDay: Math.floor(preview.startCell / getPartsPerDay()),
    startPart: preview.startCell % getPartsPerDay(),
    taskId: preview.taskId,
  };
}

function resolveRemotePresenceInjectedItem(
  preview: RemotePresencePositionPreview,
  developerId: string,
  taskPositions: Map<string, TaskPosition>,
  tasksMap: Map<string, Task>
): { position: TaskPosition; task: Task } | null {
  const task = tasksMap.get(preview.taskId);
  const saved = taskPositions.get(preview.taskId);
  if (task && saved) {
    return { position: saved, task };
  }
  if (!canSynthesizeRemotePresenceCard(preview)) {
    return null;
  }
  const position = saved ?? synthesizeRemotePresencePosition(preview, developerId);
  if (!position) {
    return null;
  }
  return {
    position,
    task: task ?? synthesizeRemotePresenceNoteTask(preview.taskId, preview.note),
  };
}

/** Чужой drag/resize: сдвиг на этой строке или перенос карточки на другую. */
export function applyRemotePresencePositionToDeveloperTasks(
  positionedTasks: Array<{ task: Task; position: TaskPosition }>,
  preview: RemotePresencePositionPreview | null,
  developerId: string,
  taskPositions: Map<string, TaskPosition>,
  tasksMap: Map<string, Task>,
  totalCells: number
): Array<{ task: Task; position: TaskPosition }> {
  if (!preview) {
    return positionedTasks;
  }
  if (preview.assignee && preview.assignee !== developerId) {
    return positionedTasks.filter((item) => item.task.id !== preview.taskId);
  }
  let next = positionedTasks;
  if (preview.assignee === developerId && !next.some((item) => item.task.id === preview.taskId)) {
    const injected = resolveRemotePresenceInjectedItem(
      preview,
      developerId,
      taskPositions,
      tasksMap
    );
    if (injected) {
      next = [...next, injected];
    }
  }
  return applyTaskResizePreviewToPositionedTasks(next, preview, totalCells);
}

/** Чужой вертикальный ресайз: span/layerShiftUp поверх локальных override. */
export function applyRemotePresenceCardRowPreviews(
  base: ReadonlyMap<string, StickyNoteCardRowLayout>,
  remotes: ReadonlyMap<string, SprintPresenceGestureCardRow>,
  skipTaskId: string | null
): Map<string, StickyNoteCardRowLayout> {
  if (remotes.size === 0) {
    return base instanceof Map ? base : new Map(base);
  }
  const next = new Map(base);
  for (const [taskId, layout] of remotes) {
    if (taskId === skipTaskId) {
      continue;
    }
    next.set(taskId, layout);
  }
  return next;
}

/**
 * TP в шапке скрываем (режим отдельных QA-задач) только если все задачи строки с TP — отдельные QA;
 * одна такая задача не должна прятать TP встроенного тестирования на той же строке.
 */
function shouldHideRowTestPoints(
  volumeTasks: Array<{ task: Task }>,
  originalIdsOnRow: ReadonlySet<string>
): boolean {
  if (!volumeTasks.some(({ task }) => task.hideTestPointsByIntegration === true)) {
    return false;
  }
  return volumeTasks.every(
    ({ task }) =>
      task.hideTestPointsByIntegration === true || getTaskTestPointsInList(task, originalIdsOnRow) <= 0
  );
}

/**
 * Итоги SP/TP строки свимлейна. «Сделано» — правила завершения организации (SP и TP раздельно:
 * статус готовности к релизу закрывает TP, но не SP); без правил — эвристика по статусу.
 */
export function computeSwimlanePointTotals(
  positionedTasks: Array<{ task: Task; position: TaskPosition }>,
  rules?: SprintTaskCompletionRules | null
): {
  completedSP: number;
  completedTP: number;
  hasVolumeTasks: boolean;
  hideTestPoints: boolean;
  totalSP: number;
  totalTP: number;
} {
  const volumeTasks = positionedTasks.filter(({ task }) => shouldCountTaskForParticipantVolume(task));
  const originalIdsOnRow = collectOriginalTaskIds(volumeTasks.map(({ task }) => task));

  let totalSP = 0;
  let totalTP = 0;
  let completedSP = 0;
  let completedTP = 0;
  for (const { task } of volumeTasks) {
    const sp = getTaskStoryPoints(task);
    const tp = getTaskTestPointsInList(task, originalIdsOnRow);
    totalSP += sp;
    totalTP += tp;
    if (isTaskCompleted(task, rules)) completedSP += sp;
    if (isTaskCompleted(task, rules)) completedTP += tp;
  }

  return {
    completedSP,
    completedTP,
    hasVolumeTasks: volumeTasks.length > 0,
    hideTestPoints: shouldHideRowTestPoints(volumeTasks, originalIdsOnRow),
    totalSP,
    totalTP,
  };
}

export function computeSwimlaneLayoutDimensions(input: {
  baselineLayerMap: Map<string, number>;
  minTaskLayers?: number;
  /** Доп. слои как у фото/диаграммы (без stacked-зазора), например hover «+» 2×2. */
  previewSpanLayers?: number;
  showParent: boolean;
  taskLayerMap: Map<string, number>;
  taskLayerSpanById?: Map<string, number>;
  taskVerticalLayoutById?: Map<string, { layerShiftUp: number; span: number }>;
}): {
  baseHeight: number;
  baselineLayerHeight: number;
  contentMaxTaskLayers: number;
  hasBaselineOverlaps: boolean;
  hasTaskOverlaps: boolean;
  layerHeight: number;
  maxBaselineLayers: number;
  maxTaskLayers: number;
  taskBandTotalHeight: number;
  taskBandVisualHeight: number;
  totalHeight: number;
} {
  const { hasTaskOverlaps, maxTaskLayers: contentMaxTaskLayers } = resolveMaxOccupiedTaskLayers(
    input.taskLayerMap,
    input.taskVerticalLayoutById ??
      (input.taskLayerSpanById
        ? new Map(
            [...input.taskLayerSpanById.entries()].map(([id, span]) => [
              id,
              { span, layerShiftUp: 0 },
            ])
          )
        : undefined)
  );
  const maxTaskLayers = Math.max(
    contentMaxTaskLayers,
    input.minTaskLayers ?? 1,
    input.previewSpanLayers ?? 1
  );
  const userReservedExtraLayers = (input.minTaskLayers ?? 1) > contentMaxTaskLayers;
  const maxBaselineLayers = Math.max(...Array.from(input.baselineLayerMap.values()), -1) + 1 || 0;
  const hasBaselineOverlaps = maxBaselineLayers > 1;
  const singleRowHeight = input.showParent ? 97 : 82;
  const oneCardHeightPx = resolveSwimlaneOneCardHeightPx(input.showParent);
  const layerHeight = hasTaskOverlaps ? oneCardHeightPx : singleRowHeight;
  const baseHeight = layerHeight;
  const stackedBandHeight = resolveSwimlaneStackedTaskBandHeightPx(maxTaskLayers, oneCardHeightPx);
  const taskBandTotalHeight = hasTaskOverlaps ? stackedBandHeight : singleRowHeight;
  const photoRowHeight =
    !hasTaskOverlaps && maxTaskLayers > 1 && !userReservedExtraLayers
      ? maxTaskLayers * oneCardHeightPx + SWIMLANE_TASK_ROW_VERTICAL_INSET_PX * 2
      : 0;
  const reservedRowHeight =
    userReservedExtraLayers && !hasTaskOverlaps ? stackedBandHeight : 0;
  const taskBandVisualHeight = Math.max(taskBandTotalHeight, photoRowHeight, reservedRowHeight);
  const totalHeight = taskBandVisualHeight;
  const baselineLayerHeight =
    hasBaselineOverlaps && maxBaselineLayers > 0 ? totalHeight / maxBaselineLayers : totalHeight;

  return {
    baseHeight,
    baselineLayerHeight,
    contentMaxTaskLayers,
    hasBaselineOverlaps,
    hasTaskOverlaps,
    layerHeight,
    maxBaselineLayers,
    maxTaskLayers,
    taskBandTotalHeight,
    taskBandVisualHeight,
    totalHeight,
  };
}
