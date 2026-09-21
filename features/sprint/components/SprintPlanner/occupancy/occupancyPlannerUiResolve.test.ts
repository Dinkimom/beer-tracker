import { describe, expect, it } from 'vitest';

import { SprintPlannerUiStore } from '@/lib/layers/application/mobx/stores/sprintPlannerUiStore';

import { resolveOccupancyPlannerUiState } from './occupancyPlannerUiResolve';

describe('resolveOccupancyPlannerUiState', () => {
  const props = {
    contextMenuTaskId: 'ctx-prop',
    globalNameFilter: 'find-me',
    segmentEditTaskId: 'seg-prop',
  };

  it('при usePlannerUiStore=false возвращает пропсы', () => {
    const store = new SprintPlannerUiStore();
    store.setContextMenuTaskId('ctx-store');
    store.setGlobalNameFilter('store-filter');
    store.setSegmentEditTaskId('seg-store');

    expect(resolveOccupancyPlannerUiState(false, store, props)).toEqual(props);
  });

  it('при usePlannerUiStore=true берёт значения из стора', () => {
    const store = new SprintPlannerUiStore();
    store.setContextMenuTaskId('ctx-store');
    store.setGlobalNameFilter('store-filter');
    store.setSegmentEditTaskId('seg-store');

    expect(resolveOccupancyPlannerUiState(true, store, props)).toEqual({
      contextMenuTaskId: 'ctx-store',
      globalNameFilter: 'store-filter',
      segmentEditTaskId: 'seg-store',
    });
  });
});
