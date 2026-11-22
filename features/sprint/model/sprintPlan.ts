import type { PositionHistoryOptions, TaskPositionsStore } from '@/lib/layers/application/mobx/stores/taskPositionsStore';
import type { Developer, Task, TaskPosition } from '@/types';

import { getPartsPerDay } from '@/constants';
import { calculateOccupiedIntervals, findNextAvailableCell } from '@/features/task/utils/autoAssignTasks/utils/intervalUtils';
import {
  canAutoAddTaskToSwimlane,
  resolveAutoAddAssigneeId,
} from '@/features/task/utils/canAutoAddTaskToSwimlane';
import { getTaskPoints } from '@/features/task/utils/taskUtils';
import { storyPointsToTimeslots } from '@/lib/pointsUtils';

import {
  clearTaskScheduleDatesInList,
  resolveIssueKeyForScheduleClear,
} from './clearTaskScheduleDates';

interface SprintPlanDeps {
  positions: TaskPositionsStore;
  sprintId: number | null;
  /** Задачи и QA-задачи доски по id (QA — и по id исходной задачи). */
  taskById: (taskId: string) => Task | undefined;
  tasksMap: () => ReadonlyMap<string, Task>;
  updateTasks: (updater: (prev: Task[]) => Task[]) => void;
}

/** План переставили руками: плановые поля идут за фактическими, baseline считается от нового плана. */
function withPlanFollowingActual(position: TaskPosition): TaskPosition {
  return {
    ...position,
    plannedDuration: position.duration,
    plannedStartDay: position.startDay,
    plannedStartPart: position.startPart,
  };
}

/**
 * Раскладка задач спринта на плане: поставить, снять, добавить в первое свободное место.
 * Правка сразу на доске и в истории плана, запись — через стор позиций.
 */
export class SprintPlan {
  constructor(private readonly deps: SprintPlanDeps) {}

  /** Поставить задачу (перетаскивание, сброс на дорожку). Локальный черновик на сервер не пишется. */
  readonly place = (taskId: string, position: TaskPosition, history?: PositionHistoryOptions): void => {
    const { positions, sprintId } = this.deps;
    const placed = withPlanFollowingActual(position);
    positions.setPositionsWithSave((prev) => new Map(prev).set(taskId, placed), {
      recordHistory: true,
      ...history,
    });
    const task = this.deps.taskById(taskId);
    if (task?.isLocalTask || !sprintId) {
      return;
    }
    const isQa = task?.team === 'QA';
    positions
      .savePosition(
        { ...placed, __source: 'SprintPlan.place' } as TaskPosition,
        isQa,
        isQa ? task?.originalTaskId : undefined
      )
      .catch((error) => {
        console.error('Error saving position:', error);
      });
  };

  /**
   * Снять задачу с плана: позиция уходит сразу, запрос — следом. Даты начала и срока задачи
   * убираются, иначе позиция из дат трекера вернула бы её на доску.
   */
  readonly unplace = (taskId: string): void => {
    const { positions } = this.deps;
    positions.setPositionsWithSave(
      (prev) => {
        const next = new Map(prev);
        next.delete(taskId);
        return next;
      },
      { recordHistory: true }
    );
    const issueKey = resolveIssueKeyForScheduleClear(taskId, this.deps.tasksMap());
    if (issueKey) {
      this.deps.updateTasks((prev) => clearTaskScheduleDatesInList(prev, issueKey));
    }
    positions.deletePosition(taskId).catch((error) => {
      console.error('Error deleting position:', error);
    });
  };

  /**
   * Поставить задачу в строку её исполнителя на первое свободное место от начала спринта.
   * Возвращает, поставлена ли (нет исполнителя, оценки или места — нет).
   */
  readonly autoAdd = (
    task: Task,
    board: { developers: Developer[]; positions: Map<string, TaskPosition>; timelineTotalCells: number }
  ): boolean => {
    const developerIds = board.developers.map((developer) => developer.id);
    const estimatedSP = getTaskPoints(task);
    const assigneeId = resolveAutoAddAssigneeId(task);
    if (!this.deps.sprintId || !canAutoAddTaskToSwimlane({ developerIds, estimatedSP, task }) || !assigneeId) {
      return false;
    }
    const duration = Math.max(1, storyPointsToTimeslots(estimatedSP));
    const intervals = calculateOccupiedIntervals(board.positions, developerIds).get(assigneeId) ?? [];
    const startCell = findNextAvailableCell(intervals, duration, 0, board.timelineTotalCells);
    if (startCell === null) {
      return false;
    }
    const partsPerDay = getPartsPerDay();
    const position = withPlanFollowingActual({
      assignee: assigneeId,
      duration,
      startDay: Math.floor(startCell / partsPerDay),
      startPart: startCell % partsPerDay,
      taskId: task.id,
    });
    const { positions } = this.deps;
    positions.setPositionsWithSave((prev) => new Map(prev).set(task.id, position), { recordHistory: true });
    const isQa = task.team === 'QA';
    positions.savePosition(position, isQa, isQa ? task.originalTaskId : undefined).catch((error) => {
      console.error('Error saving position:', error);
    });
    return true;
  };
}
