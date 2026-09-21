import type { BoardViewMode } from '@/hooks/useLocalStorage';
import type { GitLabMergeRequestFact } from '@/lib/gitlab/mergeRequestFactTypes';
import type { StatusFilter, Task } from '@/types';
import type { ChangelogEntry, IssueComment } from '@/types/tracker';

import { useMemo } from 'react';

import { createQATasksMap } from '@/features/qa/utils/qaTaskUtils';
import { useTaskChangelogs } from '@/features/sprint/components/SprintPlanner/occupancy/hooks/useTaskChangelogs';
import { useOccupancyTasks } from '@/features/task/hooks/useTasks';
import { isPlannerAnnotationTask } from '@/features/task/utils/swimlaneImageTask';
import {
  collectMergeRequestLinksFromTasks,
  useMergeRequestFacts,
} from '@/hooks/useMergeRequestFacts';
import { useProductTenantOrganizations } from '@/hooks/useProductTenantOrganizations';

interface UseSprintPlannerOccupancyAndSwimlaneDataParams {
  allTasksForDrag: Task[];
  /** Загружать GitLab fact (все MR ссылки задач спринта одним батчем) */
  loadGitlabFacts: boolean;
  occupancyStatusFilter: StatusFilter;
  selectedBoardId: number | null;
  selectedSprintId: number | null;
  swimlaneFactTimelineVisible: boolean;
  viewMode: BoardViewMode;
}

/**
 * Задачи для занятости (рефетч при фильтре по статусу) и длительности по changelog для таймлайна факта под свимлейном.
 * GitLab MR facts — один батч по всем задачам спринта с MergeRequestLink.
 */
export function useSprintPlannerOccupancyAndSwimlaneData({
  allTasksForDrag,
  loadGitlabFacts,
  occupancyStatusFilter,
  selectedBoardId,
  selectedSprintId,
  swimlaneFactTimelineVisible,
  viewMode,
}: UseSprintPlannerOccupancyAndSwimlaneDataParams) {
  const swimlaneFactTimelineEnabled =
    swimlaneFactTimelineVisible && (viewMode === 'full' || viewMode === 'compact');

  const swimlaneChangelogTaskIds = useMemo(() => {
    if (!swimlaneFactTimelineEnabled) {
      return [];
    }
    // Локальный черновик quick-add не имеет changelog в трекере; его id не должен
    // попадать в queryKey — иначе React Query сбрасывает кэш и таймлайны факта мигают.
    return allTasksForDrag
      .filter((task) => !isPlannerAnnotationTask(task))
      .map((task) => task.id);
  }, [swimlaneFactTimelineEnabled, allTasksForDrag]);

  const { data: swimlaneChangelogsData } = useTaskChangelogs(swimlaneChangelogTaskIds);
  const swimlaneTaskDurationsMap = swimlaneChangelogsData?.durations ?? new Map();
  const swimlaneTaskChangelogsMap =
    swimlaneChangelogsData?.changelogs ?? new Map<string, ChangelogEntry[]>();
  const swimlaneTaskIssueCommentsMap =
    swimlaneChangelogsData?.comments ?? new Map<string, IssueComment[]>();

  const occupancyTasksQuery = useOccupancyTasks(
    selectedSprintId,
    selectedBoardId,
    occupancyStatusFilter,
    { enabled: viewMode === 'occupancy' && occupancyStatusFilter !== 'all' }
  );
  const occupancyTasks = occupancyTasksQuery.data?.tasks;
  const occupancyTasksLoading = occupancyTasksQuery.isLoading || occupancyTasksQuery.isFetching;

  const occupancyTasksWithQA = useMemo(() => {
    if (!occupancyTasks) return undefined;
    const qaMap = createQATasksMap(occupancyTasks);
    return [...occupancyTasks, ...Array.from(qaMap.values())];
  }, [occupancyTasks]);

  const tasksForOccupancyRaw =
    occupancyStatusFilter === 'all' ? allTasksForDrag : (occupancyTasksWithQA ?? allTasksForDrag);
  const tasksForOccupancy = tasksForOccupancyRaw.filter((task) => !isPlannerAnnotationTask(task));

  const { activeOrganizationId } = useProductTenantOrganizations({ pollIntervalMs: 0 });
  const gitlabMrLinks = useMemo(() => {
    if (!loadGitlabFacts) return [];
    return collectMergeRequestLinksFromTasks(
      allTasksForDrag.filter((task) => !isPlannerAnnotationTask(task))
    );
  }, [allTasksForDrag, loadGitlabFacts]);
  const gitlabFactsQuery = useMergeRequestFacts(
    activeOrganizationId,
    gitlabMrLinks,
    loadGitlabFacts && gitlabMrLinks.length > 0
  );
  const gitlabFactByLink: Record<string, GitLabMergeRequestFact> = useMemo(
    () => gitlabFactsQuery.data ?? {},
    [gitlabFactsQuery.data]
  );

  return {
    gitlabFactByLink,
    occupancyTasksLoading,
    swimlaneTaskChangelogsMap,
    swimlaneTaskDurationsMap,
    swimlaneTaskIssueCommentsMap,
    tasksForOccupancy,
  };
}
