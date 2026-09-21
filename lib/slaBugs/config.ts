import type { SlaPriority } from './types';

/**
 * Сроки решения SLA-бага по критичности (от даты создания задачи).
 * P3: 1.5 месяца ≈ 45 дней; P4: 6 месяцев = 180 дней.
 */
export const SLA_BUG_RESOLUTION_DAYS: Record<SlaPriority, number> = {
  P0: 1,
  P1: 7,
  P2: 14,
  P3: 45,
  P4: 180,
};

/**
 * Порог «давно просрочен» (дней после дедлайна SLA).
 * P0–P2 совпадают или кратны сроку решения; P3/P4 — абсолютный порог после просрочки.
 */
export const SLA_BUG_LONG_OVERDUE_DAYS: Record<SlaPriority, number> = {
  P0: 3,
  P1: SLA_BUG_RESOLUTION_DAYS.P1,
  P2: SLA_BUG_RESOLUTION_DAYS.P2,
  P3: 30,
  P4: 30,
};

/**
 * Пороги классификации SLA-багов. Значения вынесены в конфиг для последующей подстройки.
 */
export const DEFAULT_SLA_BUG_THRESHOLDS = {
  p3TakeNowGrowth24h: 3,
  p3TakeNowGrowth7d: 5,
  p4TakeNowGrowth24h: 3,
  p4TakeNowGrowth7d: 6,
  p3SlaActivityHdMin: 4,
  p3SlaFreshnessDays: 30,
  p3DemoteLowRelevanceAgeDays: 30,
  p3DemoteLowRelevanceHdMax: 3,
  p3DemoteLowRelevanceLastHdDays: 30,
  p3DemoteStaleAgeDays: 180,
  p3DemoteStaleHdMax: 18,
  p3DemoteStaleLastHdDays: 90,
  p3CloseToUpgradeBlockHdMin: 18,
  p4CloseAgeDays: 90,
  p4CloseHdMax: 10,
  p3CloseToP2HdMin: 18,
  p3CloseToP2HdMax: 20,
  p4CloseToP3HdMin: 8,
  p4CloseToP3HdMax: 10,
  keyClientCloseToP2HdMin: 3,
  keyClientCloseToP2HdMax: 4,
  keyClientCloseToP1HdMin: 8,
  keyClientCloseToP1HdMax: 9,
  p3SlaTakeNowDays: 14,
  p3SlaReviewDays: 14,
  p3SlaWatchDaysMin: 15,
  p3SlaWatchDaysMax: 21,
  p4SlaReviewDays: 21,
  staleNoMovementDays: 60,
  /** ZBP: жёлтая зона — активных P1 ≥ этого порога (предупреждение). */
  zbpQualityZoneYellowP1Min: 1,
  /** ZBP: красная зона — активных P1 ≥ этого порога (фича-фриз). */
  zbpQualityZoneRedP1Min: 2,
} as const;

export type SlaBugThresholds = typeof DEFAULT_SLA_BUG_THRESHOLDS;
