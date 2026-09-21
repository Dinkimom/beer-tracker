'use client';

import { useMemo } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { DailyTabContent } from '@/features/sidebar/components/tabs/DailyTabContent';
import { resolveDailyTabSprintDays } from '@/features/sidebar/components/tabs/dailyTabHelpers';
import { useTaskSidebar } from '@/features/sidebar/contexts/TaskSidebarContext';

export function DailyTab() {
  const { t } = useI18n();
  const { selectedSprintId, sprintInfo } = useTaskSidebar();
  const sprintStartDate = sprintInfo?.startDate;
  const sprintEndDate = sprintInfo?.endDate;
  const sprintDays = useMemo(() => {
    if (!sprintStartDate) {
      return [];
    }
    return resolveDailyTabSprintDays(sprintStartDate, sprintEndDate);
  }, [sprintEndDate, sprintStartDate]);

  if (!selectedSprintId || sprintDays.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-8 text-sm text-gray-500 dark:text-gray-400">
        {t('sidebar.dailyTab.selectSprint')}
      </div>
    );
  }

  return (
    <DailyTabContent
      key={selectedSprintId}
      selectedSprintId={selectedSprintId}
      sprintDays={sprintDays}
    />
  );
}
