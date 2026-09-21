import type { OccupancyViewProps } from '../OccupancyView.types';
import type { OccupancyLayoutResolved } from './useOccupancyViewModelHelpers';

import { useOccupancyViewModelPipelineCore } from './useOccupancyViewModelPipelineHelpers';

export function useOccupancyViewModelPipeline(
  props: OccupancyViewProps,
  collapsedParents: Set<string>,
  hoveredErrorTaskId: string | null,
  hoveredPhaseTaskId: string | null,
  _isReorderMode: boolean,
  layout: OccupancyLayoutResolved,
  globalNameFilter: string,
  occupancyCallbacksResolved: NonNullable<OccupancyViewProps['occupancyCallbacks']>
) {
  return useOccupancyViewModelPipelineCore(
    props,
    collapsedParents,
    hoveredErrorTaskId,
    hoveredPhaseTaskId,
    layout,
    globalNameFilter,
    occupancyCallbacksResolved
  );
}
