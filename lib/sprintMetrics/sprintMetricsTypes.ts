/**
 * Метрики спринтов: факты по задаче (хранятся в БД) и агрегаты (считаются на чтении).
 */

import type { RetroQueueStage } from '@/lib/retro/retroFacts';

/** Версия формулы фактов. При изменении расчёта поднять — сохранённые спринты пересчитаются. */
export const SPRINT_METRICS_FORMULA_VERSION = 1;

export type SprintWorkCategory = 'bug' | 'feature' | 'other' | 'tech';

/** Что произошло с одной задачей за спринт. */
export interface SprintIssueFact {
  /** Попала в спринт после дня планирования. */
  added: boolean;
  /** Спринт закрыт, задача не сделана и уехала дальше (или осталась в нём). */
  carriedOver: boolean;
  category: SprintWorkCategory;
  codingDays: number;
  /** В спринте к концу дня планирования и не была закрыта до него. */
  committed: boolean;
  /** Рабочие дни от первого «в работе» до закрытия; null — не закрыта или нет истории. */
  cycleDays: number | null;
  declined: boolean;
  /** Закрыта в окне спринта и к его концу числится в спринте. */
  done: boolean;
  dwell: Partial<Record<RetroQueueStage, number>>;
  key: string;
  /** Сняли со спринта по ходу (не перенос и не закрытие). */
  removed: boolean;
  spEnd: number;
  spStart: number;
  team: string | null;
  tpEnd: number;
  waitingDays: number;
}

export interface SprintGoalsTally {
  done: number;
  total: number;
}

/** Сохранённая запись спринта для дашборда. */
export interface SprintMetricsRecord {
  computedAt: string;
  endDate: string;
  facts: SprintIssueFact[];
  /** Финальная запись: спринт закончился, пересчёт не нужен. */
  frozen: boolean;
  goals: SprintGoalsTally;
  name: string;
  open: boolean;
  sprintId: number;
  startDate: string;
}

/** Ответ GET /api/boards/[boardId]/sprint-metrics. */
export interface BoardSprintMetrics {
  /** Спринтов в окне, которые ещё не посчитаны (клиент повторит запрос). */
  pending: number;
  records: SprintMetricsRecord[];
  windowStart: string;
}

interface CountAndPoints {
  count: number;
  sp: number;
}

export interface SprintMetricsSummary {
  added: CountAndPoints;
  /** null у открытого спринта: переноса ещё нет. */
  carryOver: CountAndPoints | null;
  carryOverPercent: number | null;
  committed: CountAndPoints;
  committedDone: CountAndPoints;
  cycleTime: { p50Days: number; p85Days: number; sampleSize: number } | null;
  done: CountAndPoints & { tp: number };
  flowEfficiencyPercent: number | null;
  goals: SprintGoalsTally;
  goalsPercent: number | null;
  /** Закрытые задачи по типу работ: доля SP (или штук, если SP не ставят). */
  mix: Record<SprintWorkCategory, CountAndPoints>;
  removed: { count: number };
  /** Из взятого на старте закрыто, по SP (по штукам, если SP нет). */
  sayDoPercent: number | null;
  /** Добавлено по ходу ÷ взято на старте, по штукам. */
  scopeChangePercent: number | null;
  waitingByStage: Partial<Record<RetroQueueStage, number>>;
}
