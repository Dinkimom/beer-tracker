'use client';

import { useQuery } from '@tanstack/react-query';

import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';
import { fetchSprintHistory } from '@/lib/api/sprintHistory';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Планирование начинается до старта спринта, перенос задач — после конца. */
const PLANNING_LEAD_DAYS = 14;
const CARRY_OVER_TAIL_DAYS = 7;

function shiftedIso(date: string | undefined, days: number): string | null {
  if (!date) return null;
  const ms = new Date(date).getTime();
  return Number.isNaN(ms) ? null : new Date(ms + days * DAY_MS).toISOString();
}

/** События спринта для вкладки «История»: задачи из трекера и заметки, цели, стрелки доски. */
export function useSprintHistory(sprint: { endDate?: string; id: number; startDate?: string } | null) {
  const forDemoPlanner = useDemoPlannerBoardsQueryScope();
  const since = shiftedIso(sprint?.startDate, -PLANNING_LEAD_DAYS);
  const until = shiftedIso(sprint?.endDate, CARRY_OVER_TAIL_DAYS);
  return useQuery({
    queryKey: ['sprintHistory', ...(forDemoPlanner ? ['demo'] : []), sprint?.id ?? null, since, until],
    queryFn: () => fetchSprintHistory(sprint!.id, { since, until }),
    enabled: sprint != null,
    staleTime: 60 * 1000,
  });
}
