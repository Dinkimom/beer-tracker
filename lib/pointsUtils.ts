/**
 * Единая точка подсчёта Story Points (SP) и Test Points (TP).
 * Используется в свимлейне, отображении занятости, сайдбаре (метрики), бэклоге и везде, где считаются очки.
 */

import { isPlannerAnnotation } from '@/lib/planner/plannerCardKind';
import {
  getActivePlannerTimelineScale,
  storyPointsToTimeslotsForScale,
  timeslotsToStoryPointsForScale,
} from '@/lib/plannerTimelineScale';

/** Минимальный тип для подсчёта очков (Task, FeatureTask и т.д.). */
interface TaskLikeForPoints {
  hideTestPointsByIntegration?: boolean;
  id?: string;
  isLocalTask?: boolean;
  localDraftKind?: 'comment' | 'diagram' | 'existing' | 'image' | 'task' | 'widget';
  /** У QA-фантома — id оригинальной задачи. */
  originalTaskId?: string;
  storyPoints?: number | null;
  team?: string;
  testPoints?: number | null;
}

/** Заметки/фото/схемы не входят в объём; SP/TP — у задач Tracker и черновика «новая задача». */
export function shouldCountTaskForParticipantVolume(task: TaskLikeForPoints): boolean {
  if (isPlannerAnnotation({ id: task.id ?? '', localDraftKind: task.localDraftKind })) {
    return false;
  }
  if (task.isLocalTask !== true) {
    return true;
  }
  return task.localDraftKind === 'task';
}

/** Задача считается "оригинальной" (не фантом QA) — по таким считаем плановые SP/TP без дублирования. */
export function isOriginalTask(task: TaskLikeForPoints): boolean {
  return task.team !== 'QA';
}

/**
 * Вклад задачи в Story Points.
 * Синтетические QA-фантомы (embedded, team === 'QA') — 0: оценка тестирования в TP.
 * Отдельные QA-задачи (standalone, hideTestPointsByIntegration) — SP как у остальных.
 */
export function getTaskStoryPoints(task: TaskLikeForPoints): number {
  if (task.team === 'QA' && task.hideTestPointsByIntegration !== true) {
    return 0;
  }
  return task.storyPoints ?? 0;
}

/**
 * Вклад задачи в Test Points.
 * Возвращает task.testPoints ?? 0. Для итогов по спринту считаем только по оригинальным задачам, чтобы не дублировать ТП фантомов.
 */
export function getTaskTestPoints(task: TaskLikeForPoints): number {
  return task.testPoints ?? 0;
}

/** id оригинальных задач (не QA-фантомов) в наборе. */
export function collectOriginalTaskIds(tasks: readonly TaskLikeForPoints[]): Set<string> {
  const ids = new Set<string>();
  for (const task of tasks) {
    if (isOriginalTask(task) && task.id) ids.add(task.id);
  }
  return ids;
}

/**
 * TP задачи внутри набора (строка свимлейна, колонка канбана): QA-фантом несёт те же TP, что
 * оригинал, поэтому если оригинал в том же наборе — фантом даёт 0.
 */
export function getTaskTestPointsInList(
  task: TaskLikeForPoints,
  originalIdsInList: ReadonlySet<string>
): number {
  if (task.team === 'QA' && task.originalTaskId && originalIdsInList.has(task.originalTaskId)) {
    return 0;
  }
  return getTaskTestPoints(task);
}

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/** Итоги SP/TP набора задач через единые правила (фантом: SP 0, TP без дубля оригинала). */
export function sumTaskListPoints(tasks: readonly TaskLikeForPoints[]): { totalSP: number; totalTP: number } {
  const originalIds = collectOriginalTaskIds(tasks);
  let totalSP = 0;
  let totalTP = 0;
  for (const task of tasks) {
    totalSP += finiteOrZero(getTaskStoryPoints(task));
    totalTP += finiteOrZero(getTaskTestPointsInList(task, originalIds));
  }
  return { totalSP, totalTP };
}

/** Компактно: «3tp», «0tp»; не задано — «?tp». С пробелом: «3 tp», «0 tp», «? tp». */
type TaskPointsDisplayStyle = 'compact' | 'spaced';

const POINTS_DISPLAY_DECIMALS = 2;
const POINTS_DISPLAY_FACTOR = 10 ** POINTS_DISPLAY_DECIMALS;

/**
 * Округление SP/TP до сотых, чтобы дробный мусор вроде 1e-14 не ломал вёрстку.
 * 1.234 → 1.23, 1.5 → 1.5, 1 → 1.
 */
export function roundPointsForDisplay(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const rounded = Math.round(value * POINTS_DISPLAY_FACTOR) / POINTS_DISPLAY_FACTOR;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/** Текст числа очков без единиц: 1, 1.5, 1.23 (без хвостовых нулей). */
export function formatPointsForDisplay(value: number): string {
  return String(roundPointsForDisplay(value));
}

function formatOptionalPointsWithUnit(
  value: number | null | undefined,
  unit: 'sp' | 'tp',
  style: TaskPointsDisplayStyle
): string {
  if (value === undefined || value === null) {
    return style === 'spaced' ? `? ${unit}` : `?${unit}`;
  }
  const n = formatPointsForDisplay(value);
  return style === 'spaced' ? `${n} ${unit}` : `${n}${unit}`;
}

/**
 * Текст SP для UI: undefined/null — «?sp» (или «? sp»), число — в т.ч. «0sp».
 * Для сумм и логики используйте {@link getTaskStoryPoints}.
 */
export function formatTaskStoryPointsForDisplay(
  task: TaskLikeForPoints,
  style: TaskPointsDisplayStyle = 'compact'
): string {
  return formatOptionalPointsWithUnit(task.storyPoints, 'sp', style);
}

/**
 * Текст TP для UI: undefined/null — «?tp» (или «? tp»), число — в т.ч. «0tp».
 * Для сумм и логики используйте {@link getTaskTestPoints}.
 */
export function formatTaskTestPointsForDisplay(
  task: TaskLikeForPoints,
  style: TaskPointsDisplayStyle = 'compact'
): string {
  return formatOptionalPointsWithUnit(task.testPoints, 'tp', style);
}

/** Подписи итогов SP/TP; значения ≤ 0 после округления до сотых скрываются. */
export function formatSprintTotalsPointsLabels(
  totalSP: number,
  totalTP: number,
  style: TaskPointsDisplayStyle = 'compact'
): { spLabel: string | null; tpLabel: string | null } {
  const sp = roundPointsForDisplay(totalSP);
  const tp = roundPointsForDisplay(totalTP);
  return {
    spLabel: sp > 0 ? formatOptionalPointsWithUnit(sp, 'sp', style) : null,
    tpLabel: tp > 0 ? formatOptionalPointsWithUnit(tp, 'tp', style) : null,
  };
}

/** Дельта оценки: «+1.5 sp», «-0.25 tp»; после округления до 0 — null. */
export function formatSignedPointsDeltaForDisplay(
  value: number,
  unit: 'sp' | 'tp'
): string | null {
  const rounded = roundPointsForDisplay(value);
  if (rounded === 0) return null;
  return `${rounded > 0 ? '+' : ''}${formatPointsForDisplay(rounded)} ${unit}`;
}

/**
 * Таймслоты → SP по шкале активной организации.
 * По умолчанию (1 SP = слот): 1 → 1сп, 2 → 2сп, 3 → 3сп, 4–5 → 5сп, 6–7 → 8сп, 8–9 → 13сп, 10+ → 21сп.
 * Единица «сутки»: SP = длина / число слотов в дне (полдня при 2 слотах → 0.5сп).
 */
export function timeslotsToStoryPoints(timeslots: number): number {
  return timeslotsToStoryPointsForScale(timeslots, getActivePlannerTimelineScale());
}

/**
 * SP → таймслоты для начального размера фазы.
 * По умолчанию: 1 → 1, 2 → 2, 3 → 3, 4–5 → 5, 6–8 → 6, 9–13 → 8, 14+ → 10.
 * Единица «сутки»: длина = SP × слоты в дне.
 */
export function storyPointsToTimeslots(sp: number): number {
  return storyPointsToTimeslotsForScale(sp, getActivePlannerTimelineScale());
}

interface SprintPointsTotalsOptions {
  /** ID задач целей спринта — исключаются из подсчёта (delivery/discovery). */
  goalTaskIds?: string[] | string;
}

/**
 * Суммарные SP и TP по списку задач.
 * Учитываются только оригинальные задачи (не фантомы QA); при необходимости исключаются цели.
 * Один и тот же вызов даёт одинаковые итоги в свимлейне, занятости и сайдбаре.
 */
function shouldCountTaskForSprintPoints(
  task: TaskLikeForPoints,
  goalIds: Set<string>
): boolean {
  if (!isOriginalTask(task)) return false;
  return task.id == null || !goalIds.has(task.id);
}

function resolveGoalTaskIds(options?: SprintPointsTotalsOptions): Set<string> {
  if (options?.goalTaskIds == null) {
    return new Set<string>();
  }
  return new Set(Array.isArray(options.goalTaskIds) ? options.goalTaskIds : [options.goalTaskIds]);
}

export function getSprintPointsTotals(
  tasks: TaskLikeForPoints[],
  options?: SprintPointsTotalsOptions
): { totalSP: number; totalTP: number } {
  const goalIds = resolveGoalTaskIds(options);

  let totalSP = 0;
  let totalTP = 0;

  for (const task of tasks) {
    if (!shouldCountTaskForSprintPoints(task, goalIds)) continue;
    totalSP += getTaskStoryPoints(task);
    totalTP += getTaskTestPoints(task);
  }

  return { totalSP, totalTP };
}

/** Минимальный тип для длительности карточки (SP/TP по команде). */
interface TaskLikeForDurationPoints {
  hideTestPointsByIntegration?: boolean;
  storyPoints?: number;
  team?: string;
  testingOnlyByIntegrationRules?: boolean;
  testPoints?: number | null;
}

/**
 * Задача фактически является КУА-задачей: 0 СП и > 0 ТП (нет объёма разработки — только тестирование).
 * Такую задачу не дублируют синтетической QA-задачей, а фаза считается по ТП.
 */
export function isQaOnlyTask(task: TaskLikeForDurationPoints): boolean {
  return (
    (!task.storyPoints || task.storyPoints === 0) &&
    task.testPoints != null &&
    task.testPoints > 0 &&
    task.team !== 'QA'
  );
}

/**
 * Очки для длительности карточки: QA / testing-only — TP, иначе SP (с fallback 1).
 * В режиме отдельных QA-задач оценка живёт в SP.
 */
export function resolveTaskPointsForTeam(task: TaskLikeForDurationPoints): number {
  if (task.team === 'QA') {
    if (task.hideTestPointsByIntegration === true) {
      return task.storyPoints || 1;
    }
    return task.testPoints || 1;
  }
  if (task.testingOnlyByIntegrationRules === true) {
    if (task.testPoints != null && task.testPoints > 0) {
      return task.testPoints;
    }
    return task.storyPoints || 1;
  }
  if (isQaOnlyTask(task)) {
    return task.testPoints || 1;
  }
  return task.storyPoints || 1;
}

export function getTaskPoints(task: TaskLikeForDurationPoints): number {
  return resolveTaskPointsForTeam(task);
}
