import type { SprintPlannerUiStore } from '@/lib/layers/application/mobx/stores/sprintPlannerUiStore';

/** Поля UI планера, которые при `usePlannerUiStore` читаются из стора, иначе — из пропсов. */
interface OccupancyPlannerUiResolved {
  contextMenuTaskId: string | null;
  globalNameFilter: string;
  segmentEditTaskId: string | null;
}

export function resolveOccupancyPlannerUiState(
  usePlannerUiStore: boolean,
  store: Pick<
    SprintPlannerUiStore,
    'contextMenuTaskId' | 'globalNameFilter' | 'segmentEditTaskId'
  >,
  props: OccupancyPlannerUiResolved
): OccupancyPlannerUiResolved {
  if (usePlannerUiStore) {
    return {
      contextMenuTaskId: store.contextMenuTaskId,
      globalNameFilter: store.globalNameFilter,
      segmentEditTaskId: store.segmentEditTaskId,
    };
  }
  return props;
}
