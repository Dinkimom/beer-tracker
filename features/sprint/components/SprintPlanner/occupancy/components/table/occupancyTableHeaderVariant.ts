import type { SprintInfo } from './occupancyTableHeaderTypes';

export type OccupancyHeaderVariant =
  'multi-sprint' | 'quarterly-split' | 'quarterly-week' | 'single-sprint';

function resolveMultiSprintHeaderVariant(params: {
  displayAsWeeks?: boolean;
  quarterlySplitTaskColumns?: boolean;
  quarterlyWeekTimelineHeader?: boolean;
}): OccupancyHeaderVariant {
  if (params.quarterlyWeekTimelineHeader && params.quarterlySplitTaskColumns && params.displayAsWeeks) {
    return 'quarterly-split';
  }
  if (params.quarterlyWeekTimelineHeader && params.displayAsWeeks) {
    return 'quarterly-week';
  }
  return 'multi-sprint';
}

export function resolveOccupancyHeaderVariant(params: {
  displayAsWeeks?: boolean;
  quarterlySplitTaskColumns?: boolean;
  quarterlyWeekTimelineHeader?: boolean;
  sprintInfos?: SprintInfo[];
}): OccupancyHeaderVariant {
  const isMultiSprint = params.sprintInfos != null && params.sprintInfos.length > 1;
  if (isMultiSprint) {
    return resolveMultiSprintHeaderVariant(params);
  }
  return 'single-sprint';
}
