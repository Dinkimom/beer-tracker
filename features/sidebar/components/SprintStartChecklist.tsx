'use client';

/**
 * Sprint start checklist in the sidebar (Goals tab).
 */

import type { SprintStartDeveloperLoad } from './sprintStartChecklistHelpers';
import type { SprintStartLoadNorms } from '@/features/sprint/utils/sprintStartChecksHelpers';

import { useI18n } from '@/contexts/LanguageContext';
import { useTaskSidebar } from '@/features/sidebar/contexts/TaskSidebarContext';
import { SIDEBAR_INVALID_TAB_ENABLED } from '@/features/sidebar/hooks/useSidebarHeaderTabsHelpers';

import { SprintStartChecklistCheck3Details } from './SprintStartChecklistCheck3Details';
import { SprintStartChecklistCheckItem } from './SprintStartChecklistCheckItem';
import { SprintStartChecklistDeveloperLoads } from './SprintStartChecklistDeveloperLoads';

interface SprintStartChecklistProps {
  check1Passed: boolean;
  check2Passed: boolean;
  check3Passed: boolean;
  developerLoads: SprintStartDeveloperLoad[];
  invalidTasks: Array<{ task: unknown; issues: unknown[] }>;
  loadNorms: SprintStartLoadNorms;
}

export function SprintStartChecklist({
  check1Passed,
  check2Passed,
  check3Passed,
  developerLoads,
  invalidTasks,
  loadNorms,
}: SprintStartChecklistProps) {
  const { language, t } = useI18n();
  const { setMainTab } = useTaskSidebar();

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 px-4 pt-4 pb-2 flex-shrink-0 bg-white dark:bg-gray-800">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
        {t('sidebar.sprintStartChecklist.heading')}
      </h3>
      <div className="space-y-2">
        <SprintStartChecklistCheckItem passed={check1Passed} title={t('sidebar.sprintStartChecklist.check1Title')} />

        <SprintStartChecklistCheckItem passed={check2Passed} title={t('sidebar.sprintStartChecklist.check2Title')}>
          {!check2Passed && (
            <SprintStartChecklistDeveloperLoads
              developerLoads={developerLoads}
              loadNorms={loadNorms}
              t={t}
            />
          )}
        </SprintStartChecklistCheckItem>

        {SIDEBAR_INVALID_TAB_ENABLED && (
          <SprintStartChecklistCheckItem passed={check3Passed} title={t('sidebar.sprintStartChecklist.check3Title')}>
            {!check3Passed && (
              <SprintStartChecklistCheck3Details
                invalidTasksCount={invalidTasks.length}
                language={language}
                setMainTab={setMainTab}
                t={t}
              />
            )}
          </SprintStartChecklistCheckItem>
        )}
      </div>
    </div>
  );
}
