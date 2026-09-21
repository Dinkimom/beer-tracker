import type { SlaBugThresholds } from './config';
import type { SlaBugInput } from './types';

import {
  computeSlaTimeMetrics,
  hasFreshActivity,
  isFirstContactGrowth,
  isHdLow,
  isSignificantGrowth24h,
  isSignificantGrowth7d,
  matchesP4CloseReview,
  resolveP3DemoteReason,
} from './slaBugMetrics';

function growth24hCountsAsGrowth(input: SlaBugInput): boolean {
  return isSignificantGrowth24h(input.priority, input) !== 'none';
}

function growth7dCountsAsGrowth(input: SlaBugInput): boolean {
  return isSignificantGrowth7d(input.priority, input.hdGrowth7d) !== 'none';
}

export function hasAnyGrowth(input: SlaBugInput): boolean {
  return growth24hCountsAsGrowth(input) || growth7dCountsAsGrowth(input);
}

function matchesP3TakeNowByGrowth(
  input: SlaBugInput,
  thresholds: SlaBugThresholds,
): boolean {
  return (
    input.hdGrowth24h >= thresholds.p3TakeNowGrowth24h ||
    input.hdGrowth7d >= thresholds.p3TakeNowGrowth7d
  );
}

function matchesP3TakeNowBySla(
  input: SlaBugInput,
  time: ReturnType<typeof computeSlaTimeMetrics>,
  thresholds: SlaBugThresholds,
  nowMs: number,
): boolean {
  return (
    time.daysToSla != null &&
    time.daysToSla <= thresholds.p3SlaTakeNowDays &&
    input.hdCount >= thresholds.p3SlaActivityHdMin &&
    hasFreshActivity(input, thresholds, nowMs)
  );
}

function matchesP3TakeNowByNonKeyClientCloseToP2(
  input: SlaBugInput,
  thresholds: SlaBugThresholds,
): boolean {
  const { hdCount, hdGrowth24h, hdGrowth7d, keyClient } = input;
  if (keyClient) return false;
  if (hdCount < thresholds.p3CloseToP2HdMin || hdCount > thresholds.p3CloseToP2HdMax) {
    return false;
  }
  if (hdGrowth7d >= 3) return true;
  return hdGrowth24h >= 1 && !isFirstContactGrowth(input);
}

function matchesP3TakeNowByKeyClientCloseToP2(
  input: SlaBugInput,
  thresholds: SlaBugThresholds,
): boolean {
  const { hdCount, hdGrowth24h, hdGrowth7d, keyClient } = input;
  if (!keyClient) return false;
  if (
    hdCount < thresholds.keyClientCloseToP2HdMin ||
    hdCount > thresholds.keyClientCloseToP2HdMax
  ) {
    return false;
  }
  if (hdGrowth7d >= 2) return true;
  return hdGrowth24h >= 1 && !isFirstContactGrowth(input);
}

function matchesP3TakeNowByKeyClientCloseToP1(
  input: SlaBugInput,
  time: ReturnType<typeof computeSlaTimeMetrics>,
  thresholds: SlaBugThresholds,
): boolean {
  const { hdCount, hdGrowth7d, keyClient } = input;
  if (!keyClient) return false;
  if (
    hdCount < thresholds.keyClientCloseToP1HdMin ||
    hdCount > thresholds.keyClientCloseToP1HdMax
  ) {
    return false;
  }
  if (hdGrowth7d > 0) return true;
  return time.daysToSla != null && time.daysToSla <= thresholds.p3SlaTakeNowDays;
}

function matchesP3TakeNowBySupPriority(
  input: SlaBugInput,
  thresholds: SlaBugThresholds,
): boolean {
  if (!input.supPriority) return false;
  return (
    input.hdGrowth24h >= thresholds.p3TakeNowGrowth24h ||
    input.hdGrowth7d >= thresholds.p3TakeNowGrowth7d
  );
}

export function matchesP3TakeNow(
  input: SlaBugInput,
  time: ReturnType<typeof computeSlaTimeMetrics>,
  thresholds: SlaBugThresholds,
  nowMs: number,
): boolean {
  if (matchesP3TakeNowByGrowth(input, thresholds)) return true;
  if (matchesP3TakeNowBySla(input, time, thresholds, nowMs)) return true;
  if (matchesP3TakeNowByNonKeyClientCloseToP2(input, thresholds)) return true;
  if (matchesP3TakeNowByKeyClientCloseToP2(input, thresholds)) return true;
  if (matchesP3TakeNowByKeyClientCloseToP1(input, time, thresholds)) return true;
  return matchesP3TakeNowBySupPriority(input, thresholds);
}

function matchesP4TakeNowByGrowth(
  input: SlaBugInput,
  thresholds: SlaBugThresholds,
): boolean {
  return (
    input.hdGrowth24h >= thresholds.p4TakeNowGrowth24h ||
    input.hdGrowth7d >= thresholds.p4TakeNowGrowth7d
  );
}

function matchesP4TakeNowByKeyClientCloseToP2(
  input: SlaBugInput,
  thresholds: SlaBugThresholds,
): boolean {
  const { hdCount, hdGrowth7d, keyClient } = input;
  if (!keyClient) return false;
  if (
    hdCount < thresholds.keyClientCloseToP2HdMin ||
    hdCount > thresholds.keyClientCloseToP2HdMax
  ) {
    return false;
  }
  return hdGrowth7d >= 2;
}

function matchesP4TakeNowByKeyClientCloseToP1(
  input: SlaBugInput,
  thresholds: SlaBugThresholds,
): boolean {
  const { hdCount, hdGrowth7d, keyClient } = input;
  if (!keyClient) return false;
  if (
    hdCount < thresholds.keyClientCloseToP1HdMin ||
    hdCount > thresholds.keyClientCloseToP1HdMax
  ) {
    return false;
  }
  return hdGrowth7d > 0;
}

function matchesP4TakeNowBySupPriority(
  input: SlaBugInput,
  thresholds: SlaBugThresholds,
): boolean {
  if (!input.supPriority) return false;
  return (
    input.hdGrowth24h >= thresholds.p4TakeNowGrowth24h ||
    input.hdGrowth7d >= thresholds.p4TakeNowGrowth7d
  );
}

export function matchesP4TakeNow(
  input: SlaBugInput,
  thresholds: SlaBugThresholds,
): boolean {
  if (matchesP4TakeNowByGrowth(input, thresholds)) return true;
  if (matchesP4TakeNowByKeyClientCloseToP2(input, thresholds)) return true;
  if (matchesP4TakeNowByKeyClientCloseToP1(input, thresholds)) return true;
  return matchesP4TakeNowBySupPriority(input, thresholds);
}

function matchesP3WatchByGrowth(input: SlaBugInput): boolean {
  const g24 = isSignificantGrowth24h('P3', input);
  if (g24 === 'moderate' || g24 === 'weak') return true;
  return isSignificantGrowth7d('P3', input.hdGrowth7d) === 'moderate';
}

function matchesP3WatchByCloseToP2NoGrowth(
  input: SlaBugInput,
  thresholds: SlaBugThresholds,
): boolean {
  const { hdCount, keyClient } = input;
  if (keyClient) return false;
  if (hasAnyGrowth(input)) return false;
  return (
    hdCount >= thresholds.p3CloseToP2HdMin && hdCount <= thresholds.p3CloseToP2HdMax
  );
}

function matchesWatchByKeyClientCloseToP2(
  input: SlaBugInput,
  thresholds: SlaBugThresholds,
): boolean {
  const { hdCount, keyClient } = input;
  if (!keyClient) return false;
  if (isHdLow(input)) return true;
  if (hasAnyGrowth(input)) return false;
  return (
    hdCount >= thresholds.keyClientCloseToP2HdMin &&
    hdCount <= thresholds.keyClientCloseToP2HdMax
  );
}

function matchesP3WatchByKeyClient(
  input: SlaBugInput,
  thresholds: SlaBugThresholds,
): boolean {
  return matchesWatchByKeyClientCloseToP2(input, thresholds);
}

function matchesP3WatchBySlaWindow(
  input: SlaBugInput,
  time: ReturnType<typeof computeSlaTimeMetrics>,
  thresholds: SlaBugThresholds,
): boolean {
  const { hdCount } = input;
  if (time.daysToSla == null) return false;
  return (
    time.daysToSla >= thresholds.p3SlaWatchDaysMin &&
    time.daysToSla <= thresholds.p3SlaWatchDaysMax &&
    hdCount >= 1 &&
    hdCount <= 3
  );
}

export function matchesP3Watch(
  input: SlaBugInput,
  time: ReturnType<typeof computeSlaTimeMetrics>,
  thresholds: SlaBugThresholds,
): boolean {
  if (matchesP3WatchByGrowth(input)) return true;
  if (matchesP3WatchByCloseToP2NoGrowth(input, thresholds)) return true;
  if (matchesP3WatchByKeyClient(input, thresholds)) return true;
  if (input.supPriority && input.hdCount >= 1) return true;
  return matchesP3WatchBySlaWindow(input, time, thresholds);
}

function matchesP4WatchByGrowth(input: SlaBugInput): boolean {
  const g24 = isSignificantGrowth24h('P4', input);
  if (g24 === 'moderate' || g24 === 'weak') return true;
  return isSignificantGrowth7d('P4', input.hdGrowth7d) === 'moderate';
}

function matchesP4WatchByCloseToP3NoGrowth(
  input: SlaBugInput,
  thresholds: SlaBugThresholds,
): boolean {
  const { hdCount, keyClient } = input;
  if (keyClient) return false;
  if (hasAnyGrowth(input)) return false;
  return (
    hdCount >= thresholds.p4CloseToP3HdMin && hdCount <= thresholds.p4CloseToP3HdMax
  );
}

function matchesP4WatchByKeyClient(
  input: SlaBugInput,
  thresholds: SlaBugThresholds,
): boolean {
  return matchesWatchByKeyClientCloseToP2(input, thresholds);
}

export function matchesP4Watch(
  input: SlaBugInput,
  thresholds: SlaBugThresholds,
): boolean {
  if (matchesP4WatchByGrowth(input)) return true;
  if (matchesP4WatchByCloseToP3NoGrowth(input, thresholds)) return true;
  if (matchesP4WatchByKeyClient(input, thresholds)) return true;
  return input.supPriority && input.hdCount >= 1;
}

export function matchesP3Review(
  input: SlaBugInput,
  thresholds: SlaBugThresholds,
  nowMs: number,
): boolean {
  return resolveP3DemoteReason(input, thresholds, nowMs) != null;
}

export function matchesP4Review(
  input: SlaBugInput,
  time: ReturnType<typeof computeSlaTimeMetrics>,
  thresholds: SlaBugThresholds,
): boolean {
  return matchesP4CloseReview(input, time, thresholds);
}
