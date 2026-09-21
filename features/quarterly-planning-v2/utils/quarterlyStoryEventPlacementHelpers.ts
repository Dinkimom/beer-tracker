import type {
  QuarterlyPlanPhaseKind,
  QuarterlyStoryEventKind,
  StoryWeekEvent,
} from '../types';
import type { StoryPhasePosition } from '../types';
import type { TaskPosition } from '@/types';

import { isCellOccupiedByTask } from '@/features/sprint/utils/occupancyUtils';

const RELEASE_EVENT_KINDS = new Set<QuarterlyStoryEventKind>([
  'release_expected_this_week',
  'task_released',
]);

const WEEK_ANCHOR_EVENT_KINDS = new Set<QuarterlyStoryEventKind>([
  'delivery_as_planned',
  'discovery_as_planned',
  'release_expected_this_week',
]);

export function markPlanPhaseFlag(
  phase: StoryPhasePosition,
  weekIndex: number,
  weekPos: TaskPosition,
  flags: { hasDelivery: boolean; hasDiscovery: boolean }
): void {
  if (!isCellOccupiedByTask(weekIndex, 0, weekPos, 1)) {
    return;
  }
  if (phase.kind === 'discovery') {
    flags.hasDiscovery = true;
    return;
  }
  flags.hasDelivery = true;
}

function isDiscoveryPhaseIncompatible(kind: QuarterlyStoryEventKind): boolean {
  return kind === 'delivery_as_planned' || RELEASE_EVENT_KINDS.has(kind);
}

export function isStoryEventCompatibleWithPlanPhase(
  kind: QuarterlyStoryEventKind,
  planKind: QuarterlyPlanPhaseKind | null
): boolean {
  if (planKind == null) {
    return true;
  }
  if (planKind === 'discovery' && isDiscoveryPhaseIncompatible(kind)) {
    return false;
  }
  if (planKind === 'delivery' && kind === 'discovery_as_planned') {
    return false;
  }
  return true;
}

export function canPickAfterReleaseExpected(
  kind: QuarterlyStoryEventKind,
  planKind: QuarterlyPlanPhaseKind | null
): boolean {
  return kind === 'task_released' && isStoryEventCompatibleWithPlanPhase(kind, planKind);
}

export function isWeekAnchoredByExistingEvent(existingEvent: StoryWeekEvent | undefined): boolean {
  const kind = existingEvent?.kind;
  return kind != null && WEEK_ANCHOR_EVENT_KINDS.has(kind);
}

export function isTerminalStoryEventKind(kind: QuarterlyStoryEventKind): boolean {
  return kind === 'task_released';
}

export function discoveryPickDisabledReason(
  kind: QuarterlyStoryEventKind
): 'noDeliveryTakenInDiscovery' | 'noReleaseInDiscovery' | null {
  if (kind === 'delivery_as_planned') {
    return 'noDeliveryTakenInDiscovery';
  }
  if (RELEASE_EVENT_KINDS.has(kind)) {
    return 'noReleaseInDiscovery';
  }
  return null;
}
