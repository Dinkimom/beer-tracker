import type { Task } from '@/types';
import type { ChangelogEntry, IssueComment } from '@/types/tracker';

import { useMemo } from 'react';

import { isPlannerNonTrackerCard } from '@/lib/planner/plannerCardKind';

import { useTaskChangelogs } from './useTaskChangelogs';

interface UseSprintPlannerSwimlaneDataParams {
  allTasksForDrag: Task[];
  swimlaneFactTimelineEnabled: boolean;
}

/** Длительности, changelog и комментарии по задачам для таймлайна факта под свимлейном. */
export function useSprintPlannerSwimlaneData({
  allTasksForDrag,
  swimlaneFactTimelineEnabled,
}: UseSprintPlannerSwimlaneDataParams) {
  const swimlaneChangelogTaskIds = useMemo(() => {
    if (!swimlaneFactTimelineEnabled) {
      return [];
    }
    // Локальный черновик quick-add не имеет changelog в трекере; его id не должен
    // попадать в queryKey — иначе React Query сбрасывает кэш и таймлайны факта мигают.
    return allTasksForDrag
      .filter((task) => !isPlannerNonTrackerCard(task))
      .map((task) => task.id);
  }, [swimlaneFactTimelineEnabled, allTasksForDrag]);

  const { data: swimlaneChangelogsData } = useTaskChangelogs(swimlaneChangelogTaskIds);
  return {
    swimlaneTaskChangelogsMap:
      swimlaneChangelogsData?.changelogs ?? new Map<string, ChangelogEntry[]>(),
    swimlaneTaskDurationsMap: swimlaneChangelogsData?.durations ?? new Map(),
    swimlaneTaskIssueCommentsMap:
      swimlaneChangelogsData?.comments ?? new Map<string, IssueComment[]>(),
  };
}
