
import { getIssueTransitions, changeIssueStatus } from '@/lib/beerTrackerApi';

export async function resolveStatusTransitionTargetKey(
  trackerIssueKey: string,
  transitionId: string,
  targetStatusKey?: string
): Promise<{
  finalTargetStatusKey: string | null;
  transitionData: { to?: { key?: string } } | null;
}> {
  let finalTargetStatusKey: string | null = targetStatusKey || null;
  let transitionData: { to?: { key?: string } } | null = null;

  if (finalTargetStatusKey) {
    return { finalTargetStatusKey, transitionData };
  }

  try {
    const transitions = await getIssueTransitions(trackerIssueKey);
    transitionData = Array.isArray(transitions)
      ? transitions.find(
          (t: { id?: string; key?: string; to?: { key?: string } }) =>
            t.id === transitionId || t.key === transitionId
        ) || null
      : null;
    if (transitionData?.to?.key) {
      finalTargetStatusKey = transitionData.to.key;
    }
  } catch (error) {
    console.error('Failed to fetch transitions:', error);
  }

  return { finalTargetStatusKey, transitionData };
}

export function isClosingStatusTransition(
  finalTargetStatusKey: string,
  transitionId: string,
  transitionData: { to?: { key?: string } } | null
): boolean {
  return (
    finalTargetStatusKey.toLowerCase() === 'closed' ||
    transitionId.toLowerCase().includes('closed') ||
    transitionData?.to?.key?.toLowerCase() === 'closed'
  );
}

export async function submitIssueStatusChange(input: {
  extraFields?: Record<string, unknown>;
  isClosing: boolean;
  taskId: string;
  targetStatusKey: string;
  trackerIssueKey: string;
  transitionId: string;
}): Promise<void> {
  const resolution = input.isClosing ? 'fixed' : undefined;
  const success = await changeIssueStatus(
    input.trackerIssueKey,
    input.transitionId,
    resolution,
    input.extraFields,
    input.targetStatusKey
  );
  if (!success) {
    throw new Error(`Failed to change status for task ${input.taskId}`);
  }
}
