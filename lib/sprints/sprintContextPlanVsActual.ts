import type {
  SprintContextPlanVsActual,
  SprintContextPosition,
} from '@/lib/sprints/sprintContextTypes';

function normalizeStatusKey(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replaceAll(/\s+/g, '_');
}

export function isClosedSprintStatus(status: string | undefined): boolean {
  const key = normalizeStatusKey(status);
  return key === 'closed' || key === 'done' || key === 'archived' || key === 'completed';
}

export function buildPlanVsActual(input: {
  inSprint?: boolean;
  /** Задача сделана по канону «сделано» (`isTaskCompleted` со справочником трекера). */
  issueCompleted?: boolean;
  issueFound?: boolean;
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
  if (!input.issueCompleted) {
    result.carriedOver = true;
  }
  return result;
}
