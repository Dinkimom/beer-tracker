import type { SlaBugInput, SlaPriority } from './types';

import { DEFAULT_SLA_BUG_THRESHOLDS, type SlaBugThresholds } from './config';
import { computeSlaTimeMetrics } from './slaBugMetrics';

type SlaTimeMetrics = ReturnType<typeof computeSlaTimeMetrics>;

function isStaleP3DemoteCandidate(
  input: SlaBugInput,
  time: SlaTimeMetrics,
  daysSinceLastHd: number,
  thresholds: SlaBugThresholds
): boolean {
  return (
    time.taskAgeDays > thresholds.p3DemoteStaleAgeDays &&
    input.hdCount < thresholds.p3DemoteStaleHdMax &&
    input.hdGrowth24h <= 0 &&
    input.hdGrowth7d <= 0 &&
    daysSinceLastHd > thresholds.p3DemoteStaleLastHdDays
  );
}

function isLowRelevanceP3DemoteCandidate(
  input: SlaBugInput,
  time: SlaTimeMetrics,
  daysSinceLastHd: number,
  thresholds: SlaBugThresholds
): boolean {
  return (
    input.hdCount >= 1 &&
    input.hdCount <= thresholds.p3DemoteLowRelevanceHdMax &&
    (time.taskAgeDays > thresholds.p3DemoteLowRelevanceAgeDays || time.isOverdue) &&
    input.hdGrowth24h <= 0 &&
    input.hdGrowth7d <= 0 &&
    daysSinceLastHd > thresholds.p3DemoteLowRelevanceLastHdDays
  );
}

export function resolveStaleOrLowRelevanceP3DemoteReason(
  input: SlaBugInput,
  time: SlaTimeMetrics,
  daysSinceLastHd: number | null,
  thresholds: SlaBugThresholds = DEFAULT_SLA_BUG_THRESHOLDS
): 'low_relevance' | 'stale_p3' | null {
  if (daysSinceLastHd == null) {
    return null;
  }
  if (isStaleP3DemoteCandidate(input, time, daysSinceLastHd, thresholds)) {
    return 'stale_p3';
  }
  if (isLowRelevanceP3DemoteCandidate(input, time, daysSinceLastHd, thresholds)) {
    return 'low_relevance';
  }
  return null;
}

const GROWTH_24H_WEAK_RULES: Array<{
  minHdCount: number;
  priority: SlaPriority;
}> = [
  { priority: 'P3', minHdCount: 4 },
  { priority: 'P4', minHdCount: 3 },
];

export function classifyWeakGrowth24h(
  priority: SlaPriority,
  hdCount: number,
  hdGrowth24h: number
): 'moderate' | 'none' | 'sharp' | 'weak' {
  if (hdGrowth24h <= 0) {
    return 'none';
  }
  if (hdGrowth24h >= 3) {
    return 'sharp';
  }
  if (hdGrowth24h >= 2) {
    return 'moderate';
  }
  const weakRule = GROWTH_24H_WEAK_RULES.find(
    (rule) => rule.priority === priority && hdGrowth24h === 1 && hdCount >= rule.minHdCount
  );
  return weakRule ? 'weak' : 'none';
}

const GROWTH_7D_THRESHOLDS: Record<'P3' | 'P4', { moderate: number; strong: number }> = {
  P3: { moderate: 3, strong: 5 },
  P4: { moderate: 4, strong: 6 },
};

export function classifyGrowth7d(
  priority: SlaPriority,
  hdGrowth7d: number
): 'moderate' | 'none' | 'strong' {
  if (hdGrowth7d <= 0 || (priority !== 'P3' && priority !== 'P4')) {
    return 'none';
  }
  const thresholds = GROWTH_7D_THRESHOLDS[priority];
  if (hdGrowth7d >= thresholds.strong) return 'strong';
  if (hdGrowth7d >= thresholds.moderate) return 'moderate';
  return 'none';
}

function isKeyClientCloseToUpgrade(
  hdCount: number,
  thresholds: SlaBugThresholds
): boolean {
  return (
    (hdCount >= thresholds.keyClientCloseToP2HdMin &&
      hdCount <= thresholds.keyClientCloseToP2HdMax) ||
    (hdCount >= thresholds.keyClientCloseToP1HdMin &&
      hdCount <= thresholds.keyClientCloseToP1HdMax)
  );
}

export function isPriorityCloseToUpgrade(
  priority: 'P3' | 'P4',
  hdCount: number,
  thresholds: SlaBugThresholds
): boolean {
  if (priority === 'P3') {
    return hdCount >= thresholds.p3CloseToP2HdMin && hdCount <= thresholds.p3CloseToP2HdMax;
  }
  return hdCount >= thresholds.p4CloseToP3HdMin && hdCount <= thresholds.p4CloseToP3HdMax;
}

export function isKeyClientCloseToPriorityUpgrade(
  hdCount: number,
  thresholds: SlaBugThresholds
): boolean {
  return isKeyClientCloseToUpgrade(hdCount, thresholds);
}
