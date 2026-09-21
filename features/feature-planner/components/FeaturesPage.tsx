'use client';

/**
 * @deprecated Планировщик эпиков не развивается; основной экран — планер спринта.
 */

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { StatusTag } from '@/components/StatusTag';
import { useI18n } from '@/contexts/LanguageContext';
import { useBoards } from '@/features/board/hooks/useBoards';
import { getQuarterAndYear, formatQuarterYear } from '@/features/quarterly-planning-v2/utils/quarterGrouping';
import { useSelectedBoardStorage } from '@/hooks/useLocalStorage';
import { fetchEpicsList } from '@/lib/api/epics';
import { formatEpicCountLabel } from '@/lib/i18n/epicCountLabel';

import { createFeaturePlannerEpic } from './featuresPageHelpers';

interface FeaturesPageProps {
  boardId: number;
  /** База для навигации (канонический `/planner/:boardId/sprint/:sprintId` или `/`) */
  routerBasePath?: string;
}

interface EpicSummary {
  createdAt?: string;
  id: string;
  name: string;
  originalStatus?: string;
}

interface QuarterGroup {
  epics: EpicSummary[];
  key: string;
  title: string;
}

/** @deprecated Планировщик эпиков не развивается; основной экран — планер спринта. */
export function FeaturesPage({ boardId, routerBasePath = '/' }: FeaturesPageProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [selectedBoardId] = useSelectedBoardStorage();
  const { getQueueByBoardId } = useBoards();

  const [epics, setEpics] = useState<EpicSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedQuarters, setCollapsedQuarters] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const list = await fetchEpicsList(boardId, { perPage: 500 });
        if (!cancelled) {
          setEpics(
            list.map((epic) => ({
              id: epic.id,
              name: epic.name ?? epic.id,
              createdAt: epic.createdAt,
              originalStatus: epic.originalStatus,
            }))
          );
        }
      } catch (err) {
        console.error('Failed to load epics list:', err);
        if (!cancelled) {
          setError(t('planning.featurePlanner.loadEpicsFailed'));
          setEpics([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    if (boardId) {
      load();
    }

    return () => {
      cancelled = true;
    };
  }, [boardId, t]);

  const toggleQuarter = (quarterKey: string) => {
    setCollapsedQuarters(prev => {
      const next = new Set(prev);
      if (next.has(quarterKey)) {
        next.delete(quarterKey);
      } else {
        next.add(quarterKey);
      }
      return next;
    });
  };

  const handleCreateEpic = async () => {
    try {
      await createFeaturePlannerEpic({
        getQueueByBoardId,
        router,
        routerBasePath,
        selectedBoardId,
        t,
      });
    } catch (error) {
      console.error('Failed to create epic:', error);
    }
  };

  const handleEpicClick = (epicKey: string) => {
    if (!epicKey) return;
    router.push(`${routerBasePath}?page=features&epicId=${epicKey}`);
  };

  const filteredEpics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return epics;
    return epics.filter((epic) => {
      const idMatch = epic.id.toLowerCase().includes(q);
      const nameMatch = (epic.name || '').toLowerCase().includes(q);
      return idMatch || nameMatch;
    });
  }, [epics, searchQuery]);

  const groupedByQuarter = useMemo<QuarterGroup[]>(() => {
    if (filteredEpics.length === 0) return [];

    const groups = new Map<string, QuarterGroup>();

    filteredEpics.forEach((epic) => {
      const createdAt = epic.createdAt ? new Date(epic.createdAt) : new Date();
      const { quarter, year } = getQuarterAndYear(createdAt);
      const key = `${year}-Q${quarter}`;
      const title = formatQuarterYear(quarter, year);

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          title,
          epics: [],
        });
      }
      groups.get(key)!.epics.push(epic);
    });

    return Array.from(groups.values()).sort((a, b) => {
      const [yearA, qA] = a.key.split('-Q').map(Number);
      const [yearB, qB] = b.key.split('-Q').map(Number);
      if (yearA !== yearB) return yearB - yearA;
      return qB - qA;
    });
  }, [filteredEpics]);

  const totalEpics = filteredEpics.length;

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <LoadingOverlay isVisible={isLoading} message={t('planning.featurePlanner.loadingEpicsOverlay')} />

      {/* Панель поиска и кнопка добавления — в центральном контейнере, как раньше */}
      <div className="px-4 pt-4">
        <div
          className="mx-auto mb-3 max-w-4xl rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100"
          role="status"
        >
          {t('common.deprecatedFeatureNotice')}
        </div>
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="flex-1">
            <div className="relative">
              <Icon
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400"
                name="search"
              />
              <input
                className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
                placeholder={t('planning.featurePlanner.searchEpicsPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <Button
            className="gap-2 rounded-md px-3 py-2 shadow-sm"
            type="button"
            variant="primary"
            onClick={handleCreateEpic}
          >
            <Icon className="h-4 w-4" name="plus" />
            {t('planning.featurePlanner.addEpic')}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-4">
        {error && (
          <div className="p-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {!error && !isLoading && totalEpics === 0 && (
          <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
            {t('planning.featurePlanner.epicsNotFound')}
          </div>
        )}

        <div className="max-w-4xl mx-auto mt-4 space-y-3">
          {groupedByQuarter.map((group) => {
            const isCollapsed = collapsedQuarters.has(group.key);
            return (
              <div
                key={group.key}
                className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
              >
                <Button
                  className="h-auto min-h-0 w-full !justify-start rounded-none border-0 bg-transparent px-4 py-2 text-left text-sm font-medium text-gray-800 shadow-none hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                  type="button"
                  variant="ghost"
                  onClick={() => toggleQuarter(group.key)}
                >
                  <div className="flex items-center gap-2">
                    <Icon
                      className={`h-4 w-4 text-gray-500 transition-transform dark:text-gray-400 ${isCollapsed ? '' : 'rotate-90'}`}
                      name="chevron-right"
                    />
                    <span>{group.title}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatEpicCountLabel(group.epics.length, t)}
                    </span>
                  </div>
                </Button>
                {!isCollapsed && (
                  <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                    {group.epics.map((epic) => (
                      <li
                        key={epic.id}
                        className="flex cursor-pointer items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => handleEpicClick(epic.id)}
                      >
                        <div className="flex flex-col flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                              {epic.id}
                            </span>
                            {epic.originalStatus && (
                              <StatusTag
                                className="text-[10px]"
                                status={epic.originalStatus}
                              />
                            )}
                          </div>
                          <div className="mt-0.5 truncate text-sm text-gray-900 dark:text-gray-100">
                            {epic.name || t('planning.featurePlanner.untitledEpic')}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

