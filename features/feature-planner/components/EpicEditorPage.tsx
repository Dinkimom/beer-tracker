'use client';

/**
 * @deprecated Планировщик эпиков не развивается; основной экран — планер спринта.
 */

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { useSelectedBoardStorage } from '@/hooks/useLocalStorage';

import { useFeature, useGetFeature } from '../hooks/useFeatures';

import { EpicOccupancyTab } from './EpicOccupancyTab';

interface EpicEditorPageProps {
  epicId: string;
  /** База для навигации (канонический `/planner/:boardId/sprint/:sprintId` или `/`) */
  routerBasePath?: string;
}

/** @deprecated Планировщик эпиков не развивается; основной экран — планер спринта. */
export function EpicEditorPage({ epicId, routerBasePath = '/' }: EpicEditorPageProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [selectedBoardId] = useSelectedBoardStorage();
  const { data: epicData, isLoading } = useFeature(epicId, selectedBoardId);
  const getFeature = useGetFeature(epicId);

  const epic = useMemo(() => {
    if (isLoading) return null;
    return epicData || getFeature || null;
  }, [epicData, getFeature, isLoading]);

  const handleBackToList = () => {
    router.push(`${routerBasePath}?page=features`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 dark:text-gray-400">{t('planning.featurePlanner.epicEditorLoading')}</div>
      </div>
    );
  }

  if (!epic) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Icon className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" name="alert-triangle" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          {t('planning.featurePlanner.epicNotFound')}
        </h3>
        <Button className="mt-4" type="button" variant="primary" onClick={handleBackToList}>
          {t('planning.featurePlanner.backToEpicsList')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900 flex">
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Шапка: breadcrumbs и название эпика */}
        <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm px-6 py-3 space-y-2">
          <div
            className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100"
            role="status"
          >
            {t('common.deprecatedFeatureNotice')}
          </div>
          <nav className="flex items-center gap-1.5 min-w-0">
            <Button
              className="h-auto min-h-0 shrink-0 p-0 text-sm font-normal text-gray-500 hover:bg-transparent hover:text-gray-700 dark:text-gray-400 dark:hover:bg-transparent dark:hover:text-gray-300"
              type="button"
              variant="ghost"
              onClick={handleBackToList}
            >
              {t('planning.featurePlanner.epicsBreadcrumb')}
            </Button>
            <Icon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" name="chevron-right" />
            <span className="text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">
              {epic.name}
            </span>
          </nav>
        </div>

        {/* Контент планирования */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <EpicOccupancyTab epicId={epicId} />
        </div>
      </div>
    </div>
  );
}
