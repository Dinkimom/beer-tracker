import type { SlaBugInput, SlaBugSection, SlaPriority } from './types';

import {
  matchesP3Review,
  matchesP3TakeNow,
  matchesP3Watch,
  matchesP4Review,
  matchesP4TakeNow,
  matchesP4Watch,
} from './classifySlaBugSectionHelpers';
import { DEFAULT_SLA_BUG_THRESHOLDS, type SlaBugThresholds } from './config';
import { computeSlaTimeMetrics } from './slaBugMetrics';

function classifyP3Section(
  input: SlaBugInput,
  time: ReturnType<typeof computeSlaTimeMetrics>,
  thresholds: SlaBugThresholds,
  nowMs: number
): SlaBugSection {
  if (matchesP3TakeNow(input, time, thresholds, nowMs)) return 'take_now';
  if (matchesP3Review(input, thresholds, nowMs)) return 'review';
  if (matchesP3Watch(input, time, thresholds)) return 'watch';
  return 'regular';
}

function classifyP4Section(
  input: SlaBugInput,
  time: ReturnType<typeof computeSlaTimeMetrics>,
  thresholds: SlaBugThresholds
): SlaBugSection {
  if (matchesP4TakeNow(input, thresholds)) return 'take_now';
  if (matchesP4Review(input, time, thresholds)) return 'review';
  if (matchesP4Watch(input, thresholds)) return 'watch';
  return 'regular';
}

export function classifySlaBugSection(
  input: SlaBugInput,
  thresholds: SlaBugThresholds = DEFAULT_SLA_BUG_THRESHOLDS,
  nowMs: number = Date.now()
): SlaBugSection {
  const { priority } = input;
  const time = computeSlaTimeMetrics(input, nowMs);

  if (isHighPrioritySla(priority)) {
    return 'take_now';
  }
  if (priority === 'P3') {
    return classifyP3Section(input, time, thresholds, nowMs);
  }
  return classifyP4Section(input, time, thresholds);
}

function isHighPrioritySla(priority: SlaPriority): boolean {
  return priority === 'P0' || priority === 'P1' || priority === 'P2';
}
