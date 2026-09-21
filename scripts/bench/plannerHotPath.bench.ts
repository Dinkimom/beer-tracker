import { bench, describe } from 'vitest';

import { buildPlannerHotPathSprint } from './plannerHotPathFixtures';
import {
  dragCellFromMouseBurst,
  occupancyErrorReasons,
  overlappingIdsSample,
  rebuildArrowLinks,
  recomputeSwimlaneLayouts,
} from './plannerHotPathWorkloads';

function benchesFor(label: string, taskCount: number): void {
  const sprint = buildPlannerHotPathSprint({ density: 'dense', taskCount });
  describe(label, () => {
    bench('recomputeSwimlaneLayouts', () => {
      recomputeSwimlaneLayouts(sprint);
    });
    bench('occupancyErrorReasons', () => {
      occupancyErrorReasons(sprint);
    });
    bench('overlappingIdsSample', () => {
      overlappingIdsSample(sprint);
    });
    bench('dragCellFromMouseBurst', () => {
      dragCellFromMouseBurst(sprint);
    });
    bench('rebuildArrowLinks', () => {
      rebuildArrowLinks(sprint);
    });
  });
}

benchesFor('planner hot path (typical dense 100)', 100);
benchesFor('planner hot path (headroom dense 200)', 200);
