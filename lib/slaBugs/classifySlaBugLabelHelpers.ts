import type { SlaBugThresholds } from './config';
import type { SlaBugLabelKey, SlaBugSection } from './types';
import type { SlaBugInput } from './types';

import { hasAnyGrowth } from './classifySlaBugSectionHelpers';
import {
  computeSlaTimeMetrics,
  isCloseToPriorityUpgrade,
  isHdHigh,
  isHdLow,
  isHdMedium,
  isSignificantGrowth24h,
  isSignificantGrowth7d,
  resolveP3DemoteReason,
} from './slaBugMetrics';

const LABEL_PRIORITY: SlaBugLabelKey[] = [
  'sharp_growth',
  'growth_24h',
  'save_sla',
  'close_to_upgrade',
  'hd_high',
  'key_client',
  'sup_priority',
  'hd_medium',
  'hd_low',
  'demote',
  'close_p4',
  'no_growth',
  'no_signal',
];

const REVIEW_SECTION_LABEL_BOOST: SlaBugLabelKey[] = ['close_p4', 'demote'];

function appendGrowthLabels(
  labels: SlaBugLabelKey[],
  priority: SlaBugInput['priority'],
  input: SlaBugInput,
): { g24: ReturnType<typeof isSignificantGrowth24h>; g7: ReturnType<typeof isSignificantGrowth7d> } {
  const g24 = isSignificantGrowth24h(priority, input);
  const g7 = isSignificantGrowth7d(priority, input.hdGrowth7d);
  if (g24 === 'sharp') labels.push('sharp_growth');
  if (g24 === 'moderate') labels.push('growth_24h');
  return { g24, g7 };
}

const SAVE_SLA_DAY_THRESHOLDS: Partial<Record<SlaBugInput['priority'], number>> = {
  P0: 24,
  P1: 3,
  P2: 7,
  P3: 14,
};

function appendSaveSlaLabel(
  labels: SlaBugLabelKey[],
  priority: SlaBugInput['priority'],
  time: ReturnType<typeof computeSlaTimeMetrics>,
): void {
  if (time.isOverdue || time.hoursToSla == null || time.daysToSla == null) {
    return;
  }
  const hoursThreshold = SAVE_SLA_DAY_THRESHOLDS[priority];
  if (hoursThreshold == null) {
    return;
  }
  const withinThreshold =
    priority === 'P0' ? time.hoursToSla <= hoursThreshold : time.daysToSla <= hoursThreshold;
  if (withinThreshold) {
    labels.push('save_sla');
  }
}

function appendHdLabels(labels: SlaBugLabelKey[], input: SlaBugInput): void {
  if (isHdHigh(input)) {
    labels.push('hd_high');
    return;
  }
  if (isHdMedium(input)) {
    labels.push('hd_medium');
    return;
  }
  if (isHdLow(input)) {
    labels.push('hd_low');
  }
}

function appendDemoteOrCloseP4Label(
  labels: SlaBugLabelKey[],
  section: SlaBugSection,
  priority: SlaBugInput['priority'],
  demoteReason: ReturnType<typeof resolveP3DemoteReason>,
): void {
  if (demoteReason) {
    labels.push('demote');
    return;
  }
  if (section === 'review' && priority === 'P4') {
    labels.push('close_p4');
  }
}

function appendNoGrowthNoSignalLabels(
  labels: SlaBugLabelKey[],
  input: SlaBugInput,
  section: SlaBugSection,
  thresholds: SlaBugThresholds,
): void {
  if (!hasAnyGrowth(input) && input.hdCount > 0) {
    labels.push('no_growth');
  }
  const hasNoSignal =
    section === 'regular' &&
    !hasAnyGrowth(input) &&
    !isCloseToPriorityUpgrade(input, thresholds) &&
    input.hdCount <= 3 &&
    !input.keyClient &&
    !input.supPriority &&
    !isHdLow(input);
  if (hasNoSignal) {
    labels.push('no_signal');
  }
}

export function collectSlaLabels(
  input: SlaBugInput,
  section: SlaBugSection,
  thresholds: SlaBugThresholds,
  nowMs: number,
): SlaBugLabelKey[] {
  const labels: SlaBugLabelKey[] = [];
  const time = computeSlaTimeMetrics(input, nowMs);
  const { priority } = input;
  const demoteReason = resolveP3DemoteReason(input, thresholds, nowMs);
  const { g24, g7 } = appendGrowthLabels(labels, priority, input);

  appendSaveSlaLabel(labels, priority, time);

  if (isCloseToPriorityUpgrade(input, thresholds)) {
    labels.push('close_to_upgrade');
  }

  appendHdLabels(labels, input);

  if (input.keyClient) labels.push('key_client');
  if (input.supPriority) labels.push('sup_priority');

  appendDemoteOrCloseP4Label(labels, section, priority, demoteReason);
  appendNoGrowthNoSignalLabels(labels, input, section, thresholds);

  if (g7 === 'moderate' && !labels.includes('growth_24h') && g24 !== 'sharp') {
    labels.push('growth_24h');
  }

  return labels;
}

function pickReviewSectionPrimaryLabel(labels: SlaBugLabelKey[]): SlaBugLabelKey | null {
  for (const key of REVIEW_SECTION_LABEL_BOOST) {
    if (labels.includes(key)) {
      return key;
    }
  }
  return null;
}

function pickDefaultPrimaryLabel(labels: SlaBugLabelKey[]): SlaBugLabelKey | null {
  for (const key of LABEL_PRIORITY) {
    if (labels.includes(key)) {
      return key;
    }
  }
  return null;
}

function resolvePrimaryLabelCandidate(
  labels: SlaBugLabelKey[],
  section: SlaBugSection | undefined,
  input: SlaBugInput | undefined,
  demoteReason: ReturnType<typeof resolveP3DemoteReason> | undefined
): SlaBugLabelKey | null {
  if (demoteReason && labels.includes('demote')) {
    return 'demote';
  }
  if (section === 'review') {
    const reviewLabel = pickReviewSectionPrimaryLabel(labels);
    if (reviewLabel) {
      return reviewLabel;
    }
  }
  return pickDefaultPrimaryLabel(labels);
}

export function pickPrimaryLabel(
  labels: SlaBugLabelKey[],
  section?: SlaBugSection,
  input?: SlaBugInput,
  _nowMs: number = Date.now(),
  demoteReason?: ReturnType<typeof resolveP3DemoteReason>,
): SlaBugLabelKey | null {
  const candidate = resolvePrimaryLabelCandidate(labels, section, input, demoteReason);
  if (candidate) {
    return candidate;
  }
  if (input && (input.priority === 'P0' || input.priority === 'P1' || input.priority === 'P2')) {
    return null;
  }
  return labels.length > 0 ? 'no_signal' : null;
}
