'use client';

import type { OccupancyScrollCtxValue } from '../OccupancyScrollCtx';
import type { OccupancyViewProps } from '../OccupancyView.types';
import type { OccupancyViewTableSectionProps } from '../OccupancyViewTableSection';

import { toggleCollapsedParent } from './useOccupancyViewModelHelpers';
import { useOccupancyViewModelLocalState } from './useOccupancyViewModelStateHelpers';
import { buildOccupancyViewModelTableSectionFromState } from './useOccupancyViewModelTablePropsHelpers';

interface UseOccupancyViewModelResult {
  occupancyScrollCtxValue: OccupancyScrollCtxValue;
  tableSectionProps: OccupancyViewTableSectionProps;
}

export function useOccupancyViewModel(props: OccupancyViewProps): UseOccupancyViewModelResult {
  const state = useOccupancyViewModelLocalState(props);

  const handleDragEnd = state.pipeline.dragAndDrop.handleOccupancyDragEnd;

  const toggleParent = (parentId: string) => {
    state.setCollapsedParents((prev) => toggleCollapsedParent(prev, parentId));
  };

  const tableSectionProps = buildOccupancyViewModelTableSectionFromState(
    props,
    state,
    handleDragEnd,
    toggleParent
  );

  return {
    occupancyScrollCtxValue: state.pipeline.scroll.occupancyScrollCtxValue,
    tableSectionProps,
  };
}
