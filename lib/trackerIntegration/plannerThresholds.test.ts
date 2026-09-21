import { describe, expect, it } from 'vitest';

import { resolveOccupancyMinEstimates, taskHasEstimateForAssignee } from './plannerThresholds';

describe('plannerThresholds', () => {
  it('resolveOccupancyMinEstimates returns defaults', () => {
    expect(resolveOccupancyMinEstimates(null)).toEqual({
      minStoryPointsForAssignee: 0,
      minTestPointsForAssignee: 0,
    });
  });

  it('reads occupancy from validationThresholds', () => {
    expect(
      resolveOccupancyMinEstimates({
        configRevision: 1,
        flags: { zeroDevPositiveQaRule: false },
        releaseReadiness: { readyStatusKey: null },
        statusDefaultsByTrackerStatusType: {},
        statusOverridesByStatusKey: {},
        testingFlowMode: 'embedded_in_dev',
        validationThresholds: {
          occupancy: { minStoryPointsForAssignee: 2, minTestPointsForAssignee: 3 },
        },
      })
    ).toEqual({ minStoryPointsForAssignee: 2, minTestPointsForAssignee: 3 });
  });

  it('taskHasEstimateForAssignee respects thresholds', () => {
    const t = { minStoryPointsForAssignee: 2, minTestPointsForAssignee: 4 };
    expect(taskHasEstimateForAssignee({ storyPoints: 2, team: 'Back' }, t)).toBe(false);
    expect(taskHasEstimateForAssignee({ storyPoints: 3, team: 'Back' }, t)).toBe(true);
    expect(taskHasEstimateForAssignee({ team: 'QA', testPoints: 4 }, t)).toBe(false);
    expect(taskHasEstimateForAssignee({ team: 'QA', testPoints: 5 }, t)).toBe(true);
  });
});
