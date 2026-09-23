/**
 * Единая точка подсчёта Story Points (SP) и Test Points (TP).
 * Используется в свимлейне, отображении занятости, сайдбаре (метрики), бэклоге и везде, где считаются очки.
 */

import {
  getActivePlannerTimelineScale,
  storyPointsToTimeslotsForScale,
  timeslotsToStoryPointsForScale,
} from '@/lib/plannerTimelineScale';

/** Минимальный тип для подсчёта очков (Task, FeatureTask и т.д.). */
interface TaskLikeForPoints {
  id?: string;
  isLocalTask?: boolean;
  localDraftKind?: 'comment' | 'diagram' | 'existing' | 'image' | 'task';
  storyPoints?: number | null;
  team?: string;
  testPoints?: number | null;
}

function isPlannerAnnotationForVolume(task: TaskLikeForPoints): boolean {
  if (
    task.localDraftKind === 'comment' ||
    task.localDraftKind === 'diagram' ||
    task.localDraftKind === 'image'
  ) {
    return true;
  }
  const id = task.id ?? '';
  return id.startsWith('comment:') || id.startsWith('local-image:');
}

/** Заметки/фото/схемы не входят в объём; SP/TP — у задач Tracker и черновика «новая задача». */
export function shouldCountTaskForParticipantVolume(task: TaskLikeForPoints): boolean {
  if (isPlannerAnnotationForVolume(task)) {
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
 * У фантомных QA-задач (team === 'QA') — 0, у остальных — task.storyPoints ?? 0.
 */
export function getTaskStoryPoints(task: TaskLikeForPoints): number {
  if (task.team === 'QA') return 0;
  return task.storyPoints ?? 0;
}

/**
 * Вклад задачи в Test Points.
 * Возвращает task.testPoints ?? 0. Для итогов по спринту считаем только по оригинальным задачам, чтобы не дублировать ТП фантомов.
 */
export function getTaskTestPoints(task: TaskLikeForPoints): number {
  return task.testPoints ?? 0;
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
 * По умолчанию: 1 → 1сп, 2 → 2сп, 3 → 3сп, 4–5 → 5сп, 6–7 → 8сп, 8–9 → 13сп, 10+ → 21сп.
 * Единица «сутки» делит длину на число слотов в дне и ищет по той же лестнице.
 */
export function timeslotsToStoryPoints(timeslots: number): number {
  return timeslotsToStoryPointsForScale(timeslots, getActivePlannerTimelineScale());
}

/**
 * SP → таймслоты для начального размера фазы.
 * По умолчанию: 1 → 1, 2 → 2, 3 → 3, 4–5 → 5, 6–8 → 6, 9–13 → 8, 14+ → 10.
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
  storyPoints?: number;
  team?: string;
  testingOnlyByIntegrationRules?: boolean;
  testPoints?: number | null;
}

function isQaOnlyTaskForDuration(task: TaskLikeForDurationPoints): boolean {
  return (
    (!task.storyPoints || task.storyPoints === 0) &&
    task.testPoints != null &&
    task.testPoints > 0 &&
    task.team !== 'QA'
  );
}

/**
 * Очки для длительности карточки: QA / testing-only — TP, иначе SP (с fallback 1).
 */
export function resolveTaskPointsForTeam(task: TaskLikeForDurationPoints): number {
  if (task.team === 'QA') {
    return task.testPoints || 1;
  }
  if (task.testingOnlyByIntegrationRules === true) {
    if (task.testPoints != null && task.testPoints > 0) {
      return task.testPoints;
    }
    return task.storyPoints || 1;
  }
  if (isQaOnlyTaskForDuration(task)) {
    return task.testPoints || 1;
  }
  return task.storyPoints || 1;
}

export function getTaskPoints(task: TaskLikeForDurationPoints): number {
  return resolveTaskPointsForTeam(task);
}
