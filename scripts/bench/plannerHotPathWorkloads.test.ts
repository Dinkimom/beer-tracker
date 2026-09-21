import { describe, expect, it } from 'vitest';

import { buildPlannerHotPathSprint } from './plannerHotPathFixtures';
import {
  dragCellFromMouseBurst,
  occupancyErrorReasons,
  overlappingIdsSample,
  rebuildArrowLinks,
  recomputeSwimlaneLayouts,
} from './plannerHotPathWorkloads';

describe('planner hot-path fixtures', () => {
  it('builds a 1:1 task/position sprint with density-specific assignee counts', () => {
    const sparse = buildPlannerHotPathSprint({ density: 'sparse', taskCount: 24 });
    const dense = buildPlannerHotPathSprint({ density: 'dense', taskCount: 24 });

    expect(sparse.tasks).toHaveLength(24);
    expect(sparse.taskPositions.size).toBe(24);
    expect(sparse.assigneeIds).toHaveLength(8);
    expect(dense.assigneeIds).toHaveLength(2);
    expect(sparse.qaTasksMap.size).toBeGreaterThan(0);
  });

  it('builds a typical 100-card sprint used as the default bench size', () => {
    const typical = buildPlannerHotPathSprint({ density: 'sparse', taskCount: 100 });
    expect(typical.tasks).toHaveLength(100);
    expect(typical.taskPositions.size).toBe(100);
    expect(recomputeSwimlaneLayouts(typical)).toBeGreaterThan(0);
  });

  it('runs each workload once on a dense sprint without throwing', () => {
    const sprint = buildPlannerHotPathSprint({ density: 'dense', taskCount: 24 });

    expect(recomputeSwimlaneLayouts(sprint)).toBeGreaterThan(0);
    expect(occupancyErrorReasons(sprint)).toBeGreaterThanOrEqual(0);
    expect(overlappingIdsSample(sprint)).toBeGreaterThanOrEqual(0);
    expect(dragCellFromMouseBurst(sprint)).toBeGreaterThanOrEqual(0);
    expect(rebuildArrowLinks(sprint)).toBeGreaterThanOrEqual(0);
  });
});
