
import { changeIssueStatus, getRecentIssueTransitions } from '@/lib/beerTrackerApi';

interface TransitionToMeta {
  display?: string;
  id?: string;
  key?: string;
  statusTypeKey?: string;
}

export async function resolveStatusTransitionTargetKey(
  trackerIssueKey: string,
  transitionId: string,
  targetStatusKey?: string
): Promise<{
  finalTargetStatusKey: string | null;
  transitionData: { to?: TransitionToMeta } | null;
}> {
  let finalTargetStatusKey: string | null = targetStatusKey || null;
  let transitionData: { to?: TransitionToMeta } | null = null;

  try {
    const transitions = await getRecentIssueTransitions(trackerIssueKey);
    transitionData = Array.isArray(transitions)
      ? transitions.find(
          (t: { id?: string; key?: string; to?: TransitionToMeta }) =>
            t.id === transitionId || t.key === transitionId
        ) || null
      : null;
    if (!finalTargetStatusKey && transitionData?.to?.key) {
      finalTargetStatusKey = transitionData.to.key;
    }
  } catch (error) {
    console.error('Failed to fetch transitions:', error);
  }

  return { finalTargetStatusKey, transitionData };
}

export async function submitIssueStatusChange(input: {
  extraFields?: Record<string, unknown>;
  /** Резолюция закрывающего перехода (`closingTransitionResolution`), иначе не задаётся. */
  resolution?: string;
  targetStatusDisplay?: string;
  taskId: string;
  targetStatusKey: string;
  trackerIssueKey: string;
  transitionId: string;
}): Promise<void> {
  const success = await changeIssueStatus(
    input.trackerIssueKey,
    input.transitionId,
    input.resolution,
    input.extraFields,
    input.targetStatusKey,
    input.targetStatusDisplay
  );
  if (!success) {
    throw new Error(`Failed to change status for task ${input.taskId}`);
  }
}
