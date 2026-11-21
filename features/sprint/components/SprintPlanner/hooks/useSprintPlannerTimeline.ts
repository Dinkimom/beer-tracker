import type { BoardAvailabilityEvent } from '@/types/quarterly';
import type { SprintInfo } from '@/types/tracker';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchBoardAvailabilityEventsForBoard } from '@/lib/beerTrackerApi';
import { getSprintStartDate, resolveSprintTimelineWorkingDaysCount } from '@/utils/dateUtils';

/** Шкала спринта: дата старта, рабочие дни и события доступности людей доски. */
export function useSprintPlannerTimeline(boardId: number | null, sprintInfo: SprintInfo | null) {
  const sprintStartDate = useMemo(() => {
    return sprintInfo?.startDate ? new Date(sprintInfo.startDate) : getSprintStartDate();
  }, [sprintInfo]);

  const sprintTimelineWorkingDays = useMemo(
    () => resolveSprintTimelineWorkingDaysCount(sprintInfo?.startDate, sprintInfo?.endDate),
    [sprintInfo?.endDate, sprintInfo?.startDate]
  );

  const { data: boardAvailabilityEvents = [] } = useQuery({
    queryKey: ['boardAvailabilityEvents', boardId],
    queryFn: async (): Promise<BoardAvailabilityEvent[]> => {
      if (!boardId) return [];
      return await fetchBoardAvailabilityEventsForBoard(boardId);
    },
    enabled: boardId != null,
    staleTime: 1000 * 60 * 2,
  });

  const availability = useMemo(() => {
    if (!boardId) return null;
    return {
      planId: `board-${boardId}`,
      boardEvents: boardAvailabilityEvents,
      vacations: [],
    };
  }, [boardAvailabilityEvents, boardId]);

  return { availability, boardAvailabilityEvents, sprintStartDate, sprintTimelineWorkingDays };
}
