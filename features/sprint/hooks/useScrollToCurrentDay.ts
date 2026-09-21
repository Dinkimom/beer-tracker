/**
 * Хук для автоматической прокрутки к текущей ячейке при первой загрузке
 */

import type { SprintInfo, SprintListItem } from '@/types/tracker';

import { useEffect, useRef } from 'react';

import { DELAYS } from '@/utils/constants';

import { scrollContainerToCurrentCell, shouldSkipScrollToCurrentDay } from './useScrollToCurrentDayHelpers';

interface UseScrollToCurrentDayProps {
  isMounted: boolean;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  selectedSprintId: number | null;
  sprintInfo: SprintInfo | null;
  sprints: SprintListItem[];
  viewMode: 'compact' | 'features' | 'full' | 'kanban' | 'occupancy';
}

export function useScrollToCurrentDay({
  isMounted,
  viewMode,
  sprintInfo,
  selectedSprintId,
  sprints,
  scrollContainerRef,
}: UseScrollToCurrentDayProps) {
  const hasScrolledRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isMounted || hasScrolledRef.current) return;

    const selectedSprint = sprints.find((s) => s.id === selectedSprintId);
    if (
      shouldSkipScrollToCurrentDay({
        hasScrolled: hasScrolledRef.current,
        selectedSprint,
        sprintInfo,
      })
    ) {
      hasScrolledRef.current = true;
      return;
    }

    const scrollToCurrentCell = () => {
      const container = scrollContainerRef.current;
      if (!container || hasScrolledRef.current) return;

      if (viewMode !== 'full' && viewMode !== 'features') {
        hasScrolledRef.current = true;
        return;
      }

      scrollContainerToCurrentCell(container, 0, () => {
        hasScrolledRef.current = true;
      });
    };

    const timeoutId = setTimeout(scrollToCurrentCell, DELAYS.INITIAL_SCROLL);
    return () => clearTimeout(timeoutId);
  }, [isMounted, viewMode, sprintInfo, selectedSprintId, sprints, scrollContainerRef]);
}
