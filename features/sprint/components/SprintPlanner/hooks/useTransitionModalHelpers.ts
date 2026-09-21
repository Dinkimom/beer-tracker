import type { TransitionField } from '@/lib/beerTrackerApi';

/** typeKey -> transitionId -> fields */
export type WorkflowScreens = Record<string, Record<string, TransitionField[]>>;

/**
 * Resolve cached transition screen fields for a queue workflow.
 * Keys may be transition id/key or `${targetStatusKey}Meta` from workflow collection.
 */
export function resolveCachedTransitionFields(
  workflowScreens: WorkflowScreens,
  typeKey: string,
  transitionId: string,
  targetStatusKey?: string
): TransitionField[] {
  const byType = workflowScreens[typeKey] ?? workflowScreens.task ?? {};
  const byTransition = byType[transitionId];
  if (byTransition?.length) {
    return byTransition;
  }
  if (targetStatusKey) {
    const byTargetMeta = byType[`${targetStatusKey}Meta`];
    if (byTargetMeta?.length) {
      return byTargetMeta;
    }
  }
  return [];
}

/** Prefer live/enriched fields; keep cache when fetch is empty or failed. */
export function pickTransitionFields(
  fetched: TransitionField[],
  cached: TransitionField[]
): TransitionField[] {
  return fetched.length > 0 ? fetched : cached;
}

/** Open the transition form when the transition has a screen with any fields. */
export function shouldOpenTransitionFieldsModal(fields: TransitionField[]): boolean {
  return fields.length > 0;
}
