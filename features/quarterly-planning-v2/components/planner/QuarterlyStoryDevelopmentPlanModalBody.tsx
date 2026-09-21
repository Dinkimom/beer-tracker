'use client';

import type { StoryDevelopmentPlanOccupancyData } from '../../hooks/useStoryDevelopmentPlanOccupancyData';
import type { OccupancyRowFieldsVisibility, OccupancyTimelineSettings } from '@/hooks/useLocalStorage';

import { useI18n } from '@/contexts/LanguageContext';
import { EpicOccupancyView } from '@/features/sprint/components/SprintPlanner/occupancy/EpicOccupancyView';

interface QuarterlyStoryDevelopmentPlanModalBodyProps {
  data: StoryDevelopmentPlanOccupancyData | null | undefined;
  isError: boolean;
  isLoading: boolean;
  rowFieldsVisibility: OccupancyRowFieldsVisibility;
  timelineSettings: OccupancyTimelineSettings;
}

export function QuarterlyStoryDevelopmentPlanModalBody({
  data,
  isError,
  isLoading,
  rowFieldsVisibility,
  timelineSettings,
}: QuarterlyStoryDevelopmentPlanModalBodyProps) {
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {t('planning.quarterlyV2.developmentPlanLoading')}
          </span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-red-600 dark:text-red-400">
        {t('planning.quarterlyV2.developmentPlanLoadError')}
      </div>
    );
  }

  if (data == null) {
    return null;
  }

  if (data.tasks.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-gray-500 dark:text-gray-400">
        {t('planning.quarterlyV2.developmentPlanEmptyTasks')}
      </div>
    );
  }

  return (
    <EpicOccupancyView
      developers={data.developers}
      flatTaskList
      hideFilters
      rowFieldsVisibility={rowFieldsVisibility}
      sprintInfos={data.sprintInfos}
      taskLinks={data.taskLinks}
      taskPositions={data.taskPositions}
      tasks={data.tasks}
      timelineSettings={timelineSettings}
    />
  );
}
