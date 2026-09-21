import type {
  ClassifiedSlaBug,
  SlaBugInput,
  SlaBugSortMeta,
  SlaBugsBySection,
} from './types';
import type { Task } from '@/types';

import {
  collectSlaLabels,
  pickPrimaryLabel,
} from './classifySlaBugLabelHelpers';
import { classifySlaBugSection } from './classifySlaBugSectionResolve';
import { sortSection } from './classifySlaBugSortHelpers';
import { DEFAULT_SLA_BUG_THRESHOLDS, type SlaBugThresholds } from './config';
import { taskToSlaBugInput } from './parseSlaBugFields';
import {
  computeSlaTimeMetrics,
  isCloseToPriorityUpgrade,
  isLongOverdue,
  isSignificantGrowth24h,
  isSignificantGrowth7d,
  priorityRank,
  resolveP3DemoteReason,
} from './slaBugMetrics';


function buildSortMeta(
  input: SlaBugInput,
  thresholds: SlaBugThresholds,
  nowMs: number
): SlaBugSortMeta {
  const time = computeSlaTimeMetrics(input, nowMs);
  const g24 = isSignificantGrowth24h(input.priority, input);
  const g7 = isSignificantGrowth7d(input.priority, input.hdGrowth7d);
  return {
    priorityRank: priorityRank(input.priority),
    sharpGrowth24h: g24 === 'sharp',
    strongGrowth7d: g7 === 'strong',
    closeToUpgrade: isCloseToPriorityUpgrade(input, thresholds),
    hasFreshGrowth7d: input.hdGrowth7d > 0,
    hdCount: input.hdCount,
    daysToSla: time.daysToSla,
    isOverdue: time.isOverdue,
    overdueDays: time.overdueDays,
    isLongOverdue: time.isOverdue && isLongOverdue(input.priority, time.overdueDays, thresholds),
    supPriority: input.supPriority,
  };
}

export function classifySlaBug(
  task: Task,
  thresholds: SlaBugThresholds = DEFAULT_SLA_BUG_THRESHOLDS,
  nowMs: number = Date.now()
): ClassifiedSlaBug | null {
  const input = taskToSlaBugInput(task);
  if (!input) {
    return null;
  }
  const section = classifySlaBugSection(input, thresholds, nowMs);
  const demoteReason = resolveP3DemoteReason(input, thresholds, nowMs) ?? undefined;
  const applicableLabels = collectSlaLabels(input, section, thresholds, nowMs);
  const primaryLabel = pickPrimaryLabel(applicableLabels, section, input, nowMs, demoteReason);
  return {
    task,
    input,
    section,
    applicableLabels,
    primaryLabel,
    demoteReason,
    sortMeta: buildSortMeta(input, thresholds, nowMs),
  };
}

export function classifyAndGroupSlaBugs(
  tasks: Task[],
  thresholds: SlaBugThresholds = DEFAULT_SLA_BUG_THRESHOLDS,
  nowMs: number = Date.now()
): SlaBugsBySection {
  const grouped: SlaBugsBySection = {
    take_now: [],
    watch: [],
    regular: [],
    review: [],
  };

  for (const task of tasks) {
    const classified = classifySlaBug(task, thresholds, nowMs);
    if (!classified) continue;
    grouped[classified.section].push(classified);
  }

  return {
    take_now: sortSection('take_now', grouped.take_now),
    watch: sortSection('watch', grouped.watch),
    regular: sortSection('regular', grouped.regular),
    review: sortSection('review', grouped.review),
  };
}
