import type { PlannerIntegrationRulesDto } from './toPlannerDto';

interface OccupancyMinEstimates {
  minStoryPointsForAssignee: number;
  minTestPointsForAssignee: number;
}

interface OccupancyMinEstimateDefaults {
  minStoryPointsForAssignee: number;
  minTestPointsForAssignee: number;
}

const OCCUPANCY_MIN_ESTIMATE_DEFAULTS: OccupancyMinEstimateDefaults = {
  minStoryPointsForAssignee: 0,
  minTestPointsForAssignee: 0,
};

const DEFAULTS = OCCUPANCY_MIN_ESTIMATE_DEFAULTS;

function readNonNegativeEstimate(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function readOccupancyMinEstimatesFromObject(raw: Record<string, unknown>): OccupancyMinEstimateDefaults {
  return {
    minStoryPointsForAssignee: readNonNegativeEstimate(
      raw.minStoryPointsForAssignee,
      DEFAULTS.minStoryPointsForAssignee
    ),
    minTestPointsForAssignee: readNonNegativeEstimate(
      raw.minTestPointsForAssignee,
      DEFAULTS.minTestPointsForAssignee
    ),
  };
}

/**
 * Читает пороги из validationThresholds.occupancy (задаются админкой JSON).
 */
export function resolveOccupancyMinEstimates(
  rules: PlannerIntegrationRulesDto | null | undefined
): OccupancyMinEstimates {
  if (!rules?.validationThresholds) {
    return DEFAULTS;
  }
  const raw = rules.validationThresholds.occupancy;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return DEFAULTS;
  }
  return readOccupancyMinEstimatesFromObject(raw as Record<string, unknown>);
}

export function taskHasEstimateForAssignee(
  task: { storyPoints?: number; testPoints?: number; team?: string },
  thresholds: OccupancyMinEstimates
): boolean {
  const isQa = task.team === 'QA';
  if (isQa) {
    const tp = task.testPoints ?? 0;
    return tp > thresholds.minTestPointsForAssignee;
  }
  const sp = task.storyPoints ?? 0;
  return sp > thresholds.minStoryPointsForAssignee;
}
