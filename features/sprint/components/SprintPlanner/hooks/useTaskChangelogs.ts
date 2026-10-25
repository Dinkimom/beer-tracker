/**
 * Загружает changelog и комментарии задач для отображения фаз по статусам (факт)
 * taskId = issue key (POG-347 и т.д.)
 * Использует batch endpoint для загрузки всех changelog одним запросом
 */

import type { StatusDuration } from '@/features/task/components/TaskTimeline/types';
import type { ChangelogEntry, IssueChangelogWithComments, IssueComment } from '@/types/tracker';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { processChangelog } from '@/features/task/components/TaskTimeline/utils/processChangelog';
import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';

export function useTaskChangelogs(taskIds: string[]) {
  const uniqueIds = [...new Set(taskIds)].filter(Boolean);

  return useQuery({
    queryKey: ['taskChangelogs', uniqueIds.sort().join(',')],
    queryFn: async () => {
      if (uniqueIds.length === 0) {
        return {
          changelogs: new Map<string, ChangelogEntry[]>(),
          comments: new Map<string, IssueComment[]>(),
          durations: new Map<string, StatusDuration[]>(),
        };
      }

      // Загружаем все changelog и комментарии одним batch запросом
      const { data } = await getPlannerBeerTrackerApi().post<
        Record<string, IssueChangelogWithComments>
      >('/issues/changelog', {
        issueKeys: uniqueIds,
      });

      const durationsMap = new Map<string, StatusDuration[]>();
      const changelogsMap = new Map<string, ChangelogEntry[]>();
      const commentsMap = new Map<string, IssueComment[]>();

      // Обрабатываем каждую задачу
      for (const [issueKey, issueData] of Object.entries(data)) {
        try {
          const durations = processChangelog(issueData.changelog);
          durationsMap.set(issueKey, durations);
          changelogsMap.set(issueKey, issueData.changelog);
          commentsMap.set(issueKey, issueData.comments);
        } catch (error) {
          console.error(`Error processing changelog for ${issueKey}:`, error);
          // Продолжаем обработку остальных задач даже если одна упала
        }
      }

      return {
        changelogs: changelogsMap,
        comments: commentsMap,
        durations: durationsMap,
      };
    },
    enabled: uniqueIds.length > 0,
    staleTime: 2 * 60 * 1000, // 2 минуты
    // При добавлении задачи в спринт queryKey меняется — без этого таймлайны факта мигают.
    placeholderData: keepPreviousData,
  });
}
