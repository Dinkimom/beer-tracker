import type {
  SprintContextPlanVsActual,
  SprintContextPosition,
} from '@/lib/sprints/sprintContextTypes';

const DONE_STATUS_TYPES = new Set(['done', 'closed', 'resolved', 'cancelled', 'canceled']);

function normalizeStatusKey(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replaceAll(/\s+/g, '_');
}

export function isClosedSprintStatus(status: string | undefined): boolean {
  const key = normalizeStatusKey(status);
  return key === 'closed' || key === 'done' || key === 'archived' || key === 'completed';
}

function isDoneIssueStatus(input: {
  statusKey?: string | null;
  statusTypeKey?: string | null;
}): boolean {
  const typeKey = normalizeStatusKey(input.statusTypeKey);
  if (typeKey && DONE_STATUS_TYPES.has(typeKey)) {
    return true;
  }
  const statusKey = normalizeStatusKey(input.statusKey);
  return Boolean(statusKey && DONE_STATUS_TYPES.has(statusKey));
}

export function buildPlanVsActual(input: {
  inSprint?: boolean;
  issueFound?: boolean;
  issueStatusKey?: string | null;
  issueStatusTypeKey?: string | null;
  position: Pick<SprintContextPosition, 'duration' | 'plannedDuration'>;
  sprintStatus?: string;
  /** False when soft tracker load failed entirely — skip carriedOver guesses. */
  trackerIssuesLoaded?: boolean;
}): SprintContextPlanVsActual {
  const actualParts = Math.max(0, Math.floor(input.position.duration));
  const planParts =
    input.position.plannedDuration != null
      ? Math.max(0, Math.floor(input.position.plannedDuration))
      : actualParts;
  const slippedParts =
    input.position.plannedDuration != null ? Math.max(0, actualParts - planParts) : 0;
  const result: SprintContextPlanVsActual = {
    actualParts,
    planParts,
    slippedParts,
  };
  if (!isClosedSprintStatus(input.sprintStatus) || input.trackerIssuesLoaded === false) {
    return result;
  }
  if (input.issueFound === false || input.inSprint === false) {
    result.carriedOver = true;
    return result;
  }
  if (
    !isDoneIssueStatus({
      statusKey: input.issueStatusKey,
      statusTypeKey: input.issueStatusTypeKey,
    })
  ) {
    result.carriedOver = true;
  }
  return result;
}
