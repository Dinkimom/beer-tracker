'use client';

import type { OccupancyScrollCtxValue } from '../OccupancyScrollCtx';

import { useCallback, useMemo } from 'react';

import { useOccupancyResize } from './useOccupancyResize';

export function useOccupancyScrollBridge() {
  const { isResizing, setIsResizing, tableScrollRef, taskColumnWidth } = useOccupancyResize();

  const scrollToFn = useCallback(
    (left: number) => tableScrollRef.current?.scrollTo({ left, behavior: 'smooth' }),
    [tableScrollRef]
  );

  const occupancyScrollCtxValue = useMemo(
    (): OccupancyScrollCtxValue => ({ scrollContainerRef: tableScrollRef, scrollTo: scrollToFn }),
    [tableScrollRef, scrollToFn]
  );

  return { isResizing, occupancyScrollCtxValue, setIsResizing, tableScrollRef, taskColumnWidth };
}
