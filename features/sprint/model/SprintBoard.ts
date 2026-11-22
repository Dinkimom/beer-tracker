import type { SprintComments } from './sprintComments';
import type { SprintLinks } from './sprintLinks';
import type { SprintMovePlacementStore } from '@/lib/layers/application/mobx/stores/sprintMovePlacementStore';
import type { TaskPositionsStore } from '@/lib/layers/application/mobx/stores/taskPositionsStore';
import type { Developer, Task, TaskLink, TaskPosition } from '@/types';
import type { QueryClient, QueryKey } from '@tanstack/react-query';

import { QueryObserver } from '@tanstack/react-query';
import { action, computed, makeObservable, observable } from 'mobx';

import { createQATasksMap } from '@/features/qa/utils/qaTaskUtils';
import { patchSprintTasksQuery } from '@/features/task/hooks/useTasks';
import { stampPlanDraftTasks, stampPlanDraftTasksMap } from '@/features/task/utils/planAssigneeDraft';
import { mergeDbPositionsWithTrackerDateFallbacks, parseTrackerIsoDateOnlyLocal } from '@/lib/planner-timeline';
import { plannerLinkInvolvesComment } from '@/lib/planner/plannerLinkPersistence';
import { resolveSprintTimelineWorkingDaysCount } from '@/utils/dateUtils';

import { SprintNotes } from './sprintNotes';
import { SprintPlan } from './sprintPlan';
import { taskPositionMapsHaveSameEntries } from './taskPositionMaps';

interface SprintTasksSnapshot {
  developers: Developer[];
  tasks: Task[];
}

interface SprintBoardDeps {
  /** Доска трекера — вместе со спринтом задаёт кэш задач, который правит `updateTasks`. */
  boardId: number | null;
  /** Заметки спринта — как и связи, живут дольше модели. */
  comments: SprintComments;
  /** Демо-планер: кэш задач на фикстурах. */
  forDemoPlanner: boolean;
  /** Связи спринта живут дольше модели: модель пересоздаётся при смене дат спринта, связи — нет. */
  links: SprintLinks;
  movePlacement: SprintMovePlacementStore;
  positions: TaskPositionsStore;
  queryClient: QueryClient;
  /** Даты спринта (YYYY-MM-DD) — позиции из дат трекера и число рабочих дней сетки. */
  sprintEndDate: string | null;
  sprintId: number | null;
  sprintStartDate: string | null;
  /** Ключ кэша задач спринта — тот же, что у `useTasks`. */
  tasksQueryKey: QueryKey;
}

const NO_DEVELOPERS: Developer[] = [];
const NO_TASKS: Task[] = [];

/**
 * Доменная модель доски одного спринта: задачи и всё, что из них выводится.
 *
 * Источник правды по задачам — кэш React Query: модель держит ссылку на ответ (`observable.ref`),
 * а не копию, и не запрашивает его сама (`enabled: false`) — запрос делает `useTasks`. Правки, как и
 * раньше, идут через `patchSprintTasksQuery`, модель видит их через подписку на кэш.
 * Позиции и перенос из другого спринта — существующие сторы, модель их только читает.
 *
 * Читать модель — из `observer`: computed кэшируются только пока их кто-то наблюдает, вне реакции
 * каждое чтение пересчитывает карты заново (и отдаёт новые ссылки).
 */
function sameStringMapEntries(a: ReadonlyMap<string, string>, b: ReadonlyMap<string, string>): boolean {
  if (a.size !== b.size) return false;
  for (const [key, value] of a) {
    if (b.get(key) !== value) return false;
  }
  return true;
}

export class SprintBoard {
  snapshot: SprintTasksSnapshot | undefined;

  /** Действия с заметками, фото и схемами доски. */
  readonly notes: SprintNotes;

  /** Раскладка задач на плане: поставить, снять, добавить в свободное место. */
  readonly plan: SprintPlan;

  private readonly observer: QueryObserver<SprintTasksSnapshot>;

  constructor(private readonly deps: SprintBoardDeps) {
    this.observer = new QueryObserver<SprintTasksSnapshot>(deps.queryClient, {
      enabled: false,
      queryKey: deps.tasksQueryKey,
    });
    this.snapshot = this.observer.getCurrentResult().data;
    this.notes = new SprintNotes({
      comments: deps.comments,
      links: deps.links,
      positions: deps.positions,
      savePlannerLink: (link) => this.savePlannerLink(link),
      sprintId: deps.sprintId,
    });
    this.plan = new SprintPlan({
      positions: deps.positions,
      qaTasksByOriginalId: () => this.qaTasksByOriginalId,
      sprintId: deps.sprintId,
      taskById: (taskId) => this.tasksMap.get(taskId) ?? this.qaTasksByOriginalId.get(taskId),
      tasksMap: () => this.tasksMap,
      updateTasks: (updater) => this.updateTasks(updater),
    });
    makeObservable<SprintBoard, 'rowAssigneeById' | 'setSnapshot' | 'taskIndex'>(this, {
      allTasksForDrag: computed,
      displayPositions: computed,
      developers: computed,
      qaTasksByOriginalId: computed,
      qaTasksMap: computed,
      rowAssigneeById: computed({ equals: sameStringMapEntries }),
      rowAssigneeOf: computed,
      setSnapshot: action,
      snapshot: observable.ref,
      taskIndex: computed,
      tasks: computed,
      tasksMap: computed,
      visibleLinks: computed,
      visiblePositions: computed({ equals: taskPositionMapsHaveSameEntries }),
    });
  }

  /** Спринт доски (null — спринт не выбран). */
  get sprintId(): number | null {
    return this.deps.sprintId;
  }

  /** Заметки, фото и схемы на дорожках. */
  get comments(): SprintComments {
    return this.deps.comments;
  }

  /** Позиции задач спринта: чтение, правки с сохранением и история плана. */
  get positions(): TaskPositionsStore {
    return this.deps.positions;
  }

  /**
   * Чья задача на доске: строка свимлейна, куда поставлена карточка; незапланированная — исполнитель
   * в трекере. Перенос карточки в чужую строку исполнителя в трекере не меняет.
   */
  get rowAssigneeOf(): (task: Pick<Task, 'assignee' | 'id'>) => string | undefined {
    const rowById = this.rowAssigneeById;
    // Новая функция — только когда сменилась строка какой-то карточки: её можно класть в зависимости хуков.
    return (task) => rowById.get(task.id) || task.assignee || undefined;
  }

  /** Строка свимлейна каждой поставленной карточки; та же ссылка, пока строки не менялись. */
  private get rowAssigneeById(): ReadonlyMap<string, string> {
    const rowById = new Map<string, string>();
    for (const [taskId, position] of this.deps.positions.positions) {
      if (position.assignee) rowById.set(taskId, position.assignee);
    }
    return rowById;
  }

  /** Пользовательские связи задач (стрелки). */
  get links(): SprintLinks {
    return this.deps.links;
  }

  /**
   * Сохранить связь доски. У нас хранятся только связи с заметкой на одном из концов; связь двух
   * задач — это связь в трекере, её сохраняет обработчик трекера.
   */
  readonly savePlannerLink = async (link: Pick<TaskLink, 'fromTaskId' | 'id' | 'toTaskId'>): Promise<void> => {
    if (!plannerLinkInvolvesComment(link.fromTaskId, link.toTaskId)) {
      return;
    }
    await this.deps.links.save(link);
  };

  /** Удалить связь доски: сразу из списка, затем запросом. */
  readonly removeLink = (linkId: string): void => {
    const { links, sprintId } = this.deps;
    links.setWithSave((prev) => prev.filter((link) => link.id !== linkId));
    if (sprintId) {
      links.delete(linkId).catch((error) => {
        console.error('Error deleting link:', error);
      });
    }
  };

  /** Задачу сняли с плана — её связи на доске уходят вместе с ней. */
  readonly removeTaskLinks = (taskId: string): void => {
    const touching = this.deps.links.items.filter((link) => link.fromTaskId === taskId || link.toTaskId === taskId);
    for (const link of touching) {
      this.removeLink(link.id);
    }
  };

  /** Правка задач спринта — в кэше Query (все запросы задач этой доски и спринта). */
  readonly updateTasks = (patch: Task[] | ((prev: Task[]) => Task[])): void => {
    const { boardId, forDemoPlanner, queryClient, sprintId } = this.deps;
    patchSprintTasksQuery(queryClient, sprintId, boardId, patch, forDemoPlanner);
  };

  /** Подписка на кэш, пока доска на экране; возвращает отписку. */
  connect(): () => void {
    const unsubscribe = this.observer.subscribe((result) => this.setSnapshot(result.data));
    this.setSnapshot(this.observer.getCurrentResult().data);
    return unsubscribe;
  }

  private setSnapshot(snapshot: SprintTasksSnapshot | undefined): void {
    this.snapshot = snapshot;
  }

  get developers(): Developer[] {
    return this.snapshot?.developers ?? NO_DEVELOPERS;
  }

  /** Задачи спринта; задача, которую переносят сюда с выбором места, — в конце (в трекере она ещё в старом спринте). */
  get tasks(): Task[] {
    const list = this.snapshot?.tasks ?? NO_TASKS;
    const session = this.deps.movePlacement.session;
    const movingTask =
      session?.kind === 'task' && session.targetSprintId === this.deps.sprintId ? session.task : null;
    if (!movingTask || list.some((task) => task.id === movingTask.id)) {
      return list;
    }
    return [...list, movingTask];
  }

  /** Синтетические QA-задачи: ключ — id dev-задачи. */
  get qaTasksMap(): Map<string, Task> {
    return createQATasksMap(this.tasks);
  }

  private get taskIndex() {
    const qaTasks = Array.from(this.qaTasksMap.values());
    const allTasks = [...this.tasks, ...qaTasks];
    const tasksMap = new Map(allTasks.map((task) => [task.id, task]));
    const qaTasksByOriginalId = new Map<string, Task>();
    for (const qaTask of qaTasks) {
      if (qaTask.originalTaskId) {
        qaTasksByOriginalId.set(qaTask.originalTaskId, qaTask);
      }
    }
    return { allTasks, qaTasksByOriginalId, tasksMap };
  }

  /** QA-задача по id исходной dev-задачи. */
  get qaTasksByOriginalId(): Map<string, Task> {
    return this.taskIndex.qaTasksByOriginalId;
  }

  /** Черновики плана агента помечены: карточка читает задачу из этой карты, а не из группировки. */
  private get planDraftTaskIds(): ReadonlySet<string> | undefined {
    const positions = this.deps.positions;
    return positions.planDraftCount > 0 ? positions.draftTaskIds : undefined;
  }

  /** Задачи и QA-задачи по id. */
  get tasksMap(): Map<string, Task> {
    return stampPlanDraftTasksMap(this.taskIndex.tasksMap, this.planDraftTaskIds);
  }

  /** Задачи и QA-задачи списком — для перетаскивания и группировки. */
  get allTasksForDrag(): Task[] {
    return stampPlanDraftTasks(this.taskIndex.allTasks, this.planDraftTaskIds);
  }

  /**
   * Позиции для показа: из стора, а задачам без позиции — из дат начала и срока в трекере.
   * Без даты старта спринта — сам стор (observable.map, мутируется на месте при DnD).
   */
  get displayPositions(): Map<string, TaskPosition> {
    const dbPositions = this.deps.positions.positions as Map<string, TaskPosition>;
    const sprintStartDate = parseTrackerIsoDateOnlyLocal(this.deps.sprintStartDate);
    if (sprintStartDate == null) {
      return dbPositions;
    }
    return mergeDbPositionsWithTrackerDateFallbacks({
      dbPositions,
      sprintStartDate,
      tasks: this.tasks,
      workingDaysCount: resolveSprintTimelineWorkingDaysCount(
        this.deps.sprintStartDate,
        this.deps.sprintEndDate
      ),
    });
  }

  /** Связи, оба конца которых на доске (задачи и QA-задачи спринта). */
  get visibleLinks(): TaskLink[] {
    const { tasksMap } = this;
    return this.links.items.filter(
      (link) => tasksMap.has(link.fromTaskId) && tasksMap.has(link.toTaskId)
    );
  }

  /**
   * Позиции только задач этой доски (и их QA). Ссылка меняется, лишь когда сменился набор или
   * геометрия: наведение и presence не должны сбрасывать memo дорожек.
   */
  get visiblePositions(): Map<string, TaskPosition> {
    const next = new Map<string, TaskPosition>();
    this.displayPositions.forEach((position, taskId) => {
      if (this.tasksMap.has(taskId) || this.qaTasksByOriginalId.has(taskId)) {
        next.set(taskId, position);
      }
    });
    return next;
  }
}
