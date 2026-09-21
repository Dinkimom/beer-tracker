import type { SlaBugDemoteReason, SlaBugInput, SlaPriority } from './types';

import {
  DEFAULT_SLA_BUG_THRESHOLDS,
  SLA_BUG_LONG_OVERDUE_DAYS,
  SLA_BUG_RESOLUTION_DAYS,
  type SlaBugThresholds,
} from './config';
import {
  classifyGrowth7d,
  classifyWeakGrowth24h,
  isKeyClientCloseToPriorityUpgrade,
  isPriorityCloseToUpgrade,
  resolveStaleOrLowRelevanceP3DemoteReason,
} from './slaBugMetricsClassificationHelpers';

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export function parseDateMs(value: string | undefined): number | null {
  if (!value?.trim()) {
    return null;
  }
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * При hd_count === 1 единственное обращение совпадает с созданием задачи.
 */
export function resolveLastHdAt(
  hdCount: number,
  lastHdAt: string | undefined,
  createdAt: string | undefined
): string | undefined {
  if (hdCount === 1) {
    const createdMs = parseDateMs(createdAt);
    if (createdMs != null) {
      return new Date(createdMs).toISOString();
    }
  }
  return lastHdAt?.trim() || undefined;
}

export function daysBetween(fromMs: number, toMs: number): number {
  return (toMs - fromMs) / MS_PER_DAY;
}

export function hoursBetween(fromMs: number, toMs: number): number {
  return (toMs - fromMs) / MS_PER_HOUR;
}

interface SlaTimeMetrics {
  daysToSla: number | null;
  effectiveSlaDeadline?: string;
  hoursToSla: number | null;
  isOverdue: boolean;
  overdueDays: number;
  taskAgeDays: number;
}

/**
 * Дедлайн SLA из Tracker или расчётный: createdAt + срок решения по приоритету.
 */
function resolveEffectiveSlaDeadline(input: SlaBugInput): string | undefined {
  return resolveEffectiveSlaDeadlineFromFields(
    input.priority,
    input.createdAt,
    input.slaDeadline
  );
}

export function resolveEffectiveSlaDeadlineFromFields(
  priority: SlaPriority,
  createdAt?: string,
  slaDeadline?: string
): string | undefined {
  const fromTracker = slaDeadline?.trim();
  if (fromTracker) {
    return fromTracker;
  }
  const createdMs = parseDateMs(createdAt);
  if (createdMs == null) {
    return undefined;
  }
  const resolutionDays = SLA_BUG_RESOLUTION_DAYS[priority];
  return new Date(createdMs + resolutionDays * MS_PER_DAY).toISOString();
}

export function computeSlaTimeMetrics(
  input: SlaBugInput,
  nowMs: number = Date.now()
): SlaTimeMetrics {
  const createdMs = parseDateMs(input.createdAt) ?? nowMs;
  const taskAgeDays = Math.max(0, daysBetween(createdMs, nowMs));
  const effectiveSlaDeadline = resolveEffectiveSlaDeadline(input);
  const slaMs = parseDateMs(effectiveSlaDeadline);
  if (slaMs == null) {
    return {
      daysToSla: null,
      effectiveSlaDeadline,
      hoursToSla: null,
      isOverdue: false,
      overdueDays: 0,
      taskAgeDays,
    };
  }
  const diffMs = slaMs - nowMs;
  const isOverdue = diffMs < 0;
  const overdueDays = isOverdue ? Math.max(0, daysBetween(slaMs, nowMs)) : 0;
  return {
    daysToSla: isOverdue ? 0 : daysBetween(nowMs, slaMs),
    effectiveSlaDeadline,
    hoursToSla: isOverdue ? 0 : hoursBetween(nowMs, slaMs),
    isOverdue,
    overdueDays,
    taskAgeDays,
  };
}

export function daysSinceLastHdIncrease(
  input: SlaBugInput,
  nowMs: number = Date.now()
): number | null {
  const lastHdMs = parseDateMs(input.lastHdAt);
  const fallbackMs = parseDateMs(input.createdAt);
  const refMs = lastHdMs ?? fallbackMs;
  if (refMs == null) {
    return null;
  }
  return daysBetween(refMs, nowMs);
}

function isInActiveWork(input: SlaBugInput): boolean {
  return input.inActiveWork;
}

function blocksReviewByActuality(input: SlaBugInput): boolean {
  if (input.keyClient || input.supPriority) {
    return true;
  }
  if (input.hdGrowth7d > 0 || input.hdGrowth24h > 0) {
    return true;
  }
  if (isInActiveWork(input)) {
    return true;
  }
  return false;
}

function blocksP3DemoteReview(input: SlaBugInput, thresholds: SlaBugThresholds): boolean {
  return blocksReviewByActuality(input) || input.hdCount >= thresholds.p3CloseToUpgradeBlockHdMin;
}

export function resolveP3DemoteReason(
  input: SlaBugInput,
  thresholds: SlaBugThresholds = DEFAULT_SLA_BUG_THRESHOLDS,
  nowMs: number = Date.now()
): SlaBugDemoteReason | null {
  if (input.priority !== 'P3' || blocksP3DemoteReview(input, thresholds)) {
    return null;
  }

  const time = computeSlaTimeMetrics(input, nowMs);
  const daysSinceLastHd = daysSinceLastHdIncrease(input, nowMs);
  return resolveStaleOrLowRelevanceP3DemoteReason(input, time, daysSinceLastHd, thresholds);
}

export function matchesP4CloseReview(
  input: SlaBugInput,
  time: ReturnType<typeof computeSlaTimeMetrics>,
  thresholds: SlaBugThresholds = DEFAULT_SLA_BUG_THRESHOLDS
): boolean {
  if (input.priority !== 'P4') {
    return false;
  }
  if (blocksReviewByActuality(input)) {
    return false;
  }
  if (input.hdCount >= 11 || input.hdGrowth7d > 0) {
    return false;
  }
  return (
    time.taskAgeDays > thresholds.p4CloseAgeDays ||
    time.isOverdue ||
    (time.daysToSla != null && time.daysToSla <= thresholds.p4SlaReviewDays)
  );
}

export function hasFreshActivity(
  input: SlaBugInput,
  thresholds: SlaBugThresholds = DEFAULT_SLA_BUG_THRESHOLDS,
  nowMs: number = Date.now()
): boolean {
  if (input.keyClient || input.supPriority) {
    return true;
  }
  if (input.hdGrowth7d > 0) {
    return true;
  }
  const lastHdMs = parseDateMs(input.lastHdAt);
  if (lastHdMs != null) {
    const daysSince = daysBetween(lastHdMs, nowMs);
    if (daysSince <= thresholds.p3SlaFreshnessDays) {
      return true;
    }
  }
  return false;
}

export function isFirstContactGrowth(input: SlaBugInput): boolean {
  return input.hdGrowth24h === 1 && input.hdCount === 1;
}

export function isSignificantGrowth24h(
  priority: SlaPriority,
  input: SlaBugInput
): 'moderate' | 'none' | 'sharp' | 'weak' {
  if (isFirstContactGrowth(input)) {
    return 'none';
  }
  return classifyWeakGrowth24h(priority, input.hdCount, input.hdGrowth24h);
}

export function isSignificantGrowth7d(
  priority: SlaPriority,
  hdGrowth7d: number
): 'moderate' | 'none' | 'strong' {
  return classifyGrowth7d(priority, hdGrowth7d);
}

export function isCloseToPriorityUpgrade(
  input: SlaBugInput,
  thresholds: SlaBugThresholds = DEFAULT_SLA_BUG_THRESHOLDS
): boolean {
  const { hdCount, keyClient, priority } = input;
  if (priority !== 'P3' && priority !== 'P4') {
    return false;
  }
  if (keyClient) {
    return isKeyClientCloseToPriorityUpgrade(hdCount, thresholds);
  }
  return isPriorityCloseToUpgrade(priority, hdCount, thresholds);
}

export function isHdHigh(input: SlaBugInput): boolean {
  const { hdCount, keyClient } = input;
  if (keyClient) {
    return hdCount >= 5 && hdCount <= 9;
  }
  return hdCount >= 8 && hdCount <= 17;
}

export function isHdMedium(input: SlaBugInput): boolean {
  const { hdCount, keyClient } = input;
  if (keyClient) {
    return hdCount >= 3 && hdCount <= 4;
  }
  return hdCount >= 4 && hdCount <= 7;
}

export function isHdLow(input: SlaBugInput): boolean {
  const { hdCount, keyClient } = input;
  if (keyClient) {
    return hdCount >= 1 && hdCount <= 2;
  }
  return hdCount >= 1 && hdCount <= 3;
}

export function priorityRank(priority: SlaPriority): number {
  switch (priority) {
    case 'P0':
      return 0;
    case 'P1':
      return 1;
    case 'P2':
      return 2;
    case 'P3':
      return 3;
    case 'P4':
      return 4;
  }
}

export function isLongOverdue(
  priority: SlaPriority,
  overdueDays: number,
  _thresholds: SlaBugThresholds = DEFAULT_SLA_BUG_THRESHOLDS
): boolean {
  return overdueDays > SLA_BUG_LONG_OVERDUE_DAYS[priority];
}
