import type {
  QuarterlyPlanPhaseKind,
  QuarterlyStoryEventKind,
  StoryPhasePosition,
  StoryWeekEvent,
} from '../types';
import type { TaskPosition } from '@/types';

import {
  QUARTERLY_STORY_EVENT_CATALOG,
  type QuarterlyStoryEventCatalogEntry,
} from './quarterlyStoryEventCatalog';
import {
  canPickAfterReleaseExpected,
  discoveryPickDisabledReason,
  isStoryEventCompatibleWithPlanPhase,
  isTerminalStoryEventKind,
  isWeekAnchoredByExistingEvent,
  markPlanPhaseFlag,
} from './quarterlyStoryEventPlacementHelpers';

function discoveryPlanEventPickDisabledReason(
  kind: QuarterlyStoryEventKind,
  ctx: StoryWeekEventPlacementContext
): ReturnType<typeof discoveryPickDisabledReason> | null {
  const planKind = getPlanPhaseKindInWeek(ctx.weekIndex, ctx.weekPositions);
  if (planKind !== 'discovery') return null;
  return discoveryPickDisabledReason(kind);
}

export interface StoryWeekEventPlacementContext {
  existingEvent: StoryWeekEvent | undefined;
  weekIndex: number;
  weekPositions: Array<{ phase: StoryPhasePosition; weekPos: TaskPosition }>;
}

const UNRESTRICTED_PLACEMENT_KINDS = new Set<QuarterlyStoryEventKind>([
  'delivery_as_planned',
  'discovery_as_planned',
  'release_expected_this_week',
]);

function isUnrestrictedStoryEventPlacement(kind: QuarterlyStoryEventKind): boolean {
  return UNRESTRICTED_PLACEMENT_KINDS.has(kind);
}

/** Фаза плана в неделе (delivery приоритетнее discovery). */
export function getPlanPhaseKindInWeek(
  weekIndex: number,
  weekPositions: Array<{ phase: StoryPhasePosition; weekPos: TaskPosition }>
): QuarterlyPlanPhaseKind | null {
  const flags = { hasDelivery: false, hasDiscovery: false };

  for (const { phase, weekPos } of weekPositions) {
    markPlanPhaseFlag(phase, weekIndex, weekPos, flags);
  }

  if (flags.hasDelivery) return 'delivery';
  if (flags.hasDiscovery) return 'discovery';
  return null;
}


/**
 * Неделя подходит для событий с привязкой к плану (не взяли, уехала и т.д.):
 * есть фаза плана или якорное событие в ячейке.
 */
export function isWeekEligibleForStoryEvent({
  weekIndex,
  weekPositions,
  existingEvent,
}: StoryWeekEventPlacementContext): boolean {
  if (getPlanPhaseKindInWeek(weekIndex, weekPositions) != null) return true;
  return isWeekAnchoredByExistingEvent(existingEvent);
}

/** Можно выбрать тип события в этой неделе. */
export function canPickStoryEventKind(
  kind: QuarterlyStoryEventKind,
  ctx: StoryWeekEventPlacementContext
): boolean {
  const existingKind = ctx.existingEvent?.kind;
  const planKind = getPlanPhaseKindInWeek(ctx.weekIndex, ctx.weekPositions);

  if (existingKind != null && isTerminalStoryEventKind(existingKind)) {
    return false;
  }
  if (existingKind === 'release_expected_this_week') {
    return canPickAfterReleaseExpected(kind, planKind);
  }
  if (!isStoryEventCompatibleWithPlanPhase(kind, planKind)) return false;
  if (isUnrestrictedStoryEventPlacement(kind)) return true;
  return isWeekEligibleForStoryEvent(ctx);
}

/** Пункты попапа с учётом текущего события в ячейке. */
export function getStoryEventMenuCatalog(
  ctx: StoryWeekEventPlacementContext
): QuarterlyStoryEventCatalogEntry[] {
  const existingKind = ctx.existingEvent?.kind;
  if (existingKind != null && isTerminalStoryEventKind(existingKind)) {
    return [];
  }
  if (existingKind === 'release_expected_this_week') {
    return QUARTERLY_STORY_EVENT_CATALOG.filter(({ kind }) => kind === 'task_released');
  }
  return QUARTERLY_STORY_EVENT_CATALOG;
}

export type StoryEventMenuFollowUpHint = 'releaseExpected' | 'releaseSucceeded';

export function getStoryEventMenuFollowUpHint(
  ctx: StoryWeekEventPlacementContext
): StoryEventMenuFollowUpHint | null {
  const existingKind = ctx.existingEvent?.kind;
  if (existingKind === 'release_expected_this_week') return 'releaseExpected';
  if (existingKind != null && isTerminalStoryEventKind(existingKind)) return 'releaseSucceeded';
  return null;
}

type StoryEventPickDisabledReason =
  'noDeliveryTakenInDiscovery' | 'noDiscoveryTakenInDelivery' | 'noPlanWeek' | 'noReleaseInDiscovery';

export function storyEventPickDisabledReason(
  kind: QuarterlyStoryEventKind,
  ctx: StoryWeekEventPlacementContext
): StoryEventPickDisabledReason | null {
  if (canPickStoryEventKind(kind, ctx)) return null;

  const discoveryReason = discoveryPlanEventPickDisabledReason(kind, ctx);
  if (discoveryReason) return discoveryReason;

  const planKind = getPlanPhaseKindInWeek(ctx.weekIndex, ctx.weekPositions);
  if (planKind === 'delivery' && kind === 'discovery_as_planned') {
    return 'noDiscoveryTakenInDelivery';
  }

  return 'noPlanWeek';
}

export function storyEventPickDisabledReasonI18nKey(
  reason: StoryEventPickDisabledReason
): `planning.quarterlyV2.storyEventDisabled.${StoryEventPickDisabledReason}` {
  return `planning.quarterlyV2.storyEventDisabled.${reason}`;
}
