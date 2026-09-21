'use client';

/**
 * @deprecated Квартальное планирование не развивается; основной экран — планер спринта.
 *
 * Страница «Квартальное планирование (новое)».
 * Слева — таблица плана (свои компоненты v2), справа — сайдбар эпиков.
 */

import type {
  QuarterlyStoryEventKind,
  StoryEventsByStory,
  StoryPhasePosition,
  StoryPhasesByStory,
} from '../types';
import type { Task } from '@/types';
import type { Quarter } from '@/types';

import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/Button';
import { useConfirmDialog } from '@/components/ConfirmDialog';
import { Icon } from '@/components/Icon';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { ResizableSidebar } from '@/components/ResizableSidebar';
import { useI18n } from '@/contexts/LanguageContext';
import { useSprints } from '@/features/sprint/hooks/useSprints';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { fetchEpicsList, type EpicListItem } from '@/lib/api/epics';

import { useEpicStoriesOccupancyData } from '../hooks/useEpicStoriesOccupancyData';
import { useQuarterlyPlanV2 } from '../hooks/useQuarterlyPlanV2';
import { removeTaskFromQuarterlyPlan } from '../utils/quarterlyPlanRemove';
import { getCurrentQuarter } from '../utils/quarterUtils';
import {
  flattenStoryEventsForApi,
  normalizeStoryEventsFromApi,
  removeStoryWeekEvent,
  upsertStoryWeekEvent,
} from '../utils/storyEventsMap';
import {
  flattenStoryPhasesForApi,
  normalizeStoryPhasesFromApi,
} from '../utils/storyPhasesMap';

import { EpicsSidebar } from './EpicsSidebar';
import { QuarterlyPlannerEditModeToolbar } from './planner/QuarterlyPlannerEditModeToolbar';
import { QuarterlyPlannerHelpPopover } from './planner/QuarterlyPlannerHelpPopover';
import { QuarterlyPlannerView } from './planner/QuarterlyPlannerView';
import { formatQuarterlyTaskTitleLabel } from './planner/quarterlyTaskTitle';
import { QuarterSelector } from './QuarterSelector';

const SIDEBAR_STORAGE_KEY = 'quarterly-v2-sidebar-width';
const SIDEBAR_OPEN_KEY = 'quarterly-v2-sidebar-open';

interface QuarterlyPlanningV2PageProps {
  boardId: number;
}

/** @deprecated Квартальное планирование не развивается; основной экран — планер спринта. */
export function QuarterlyPlanningV2Page({ boardId }: QuarterlyPlanningV2PageProps) {
  const { t } = useI18n();
  const { year: initialYear, quarter: initialQuarter } = getCurrentQuarter();
  const [year, setYear] = useState(initialYear);
  const [quarter, setQuarter] = useState<Quarter>(initialQuarter);
  const [sidebarWidth, setSidebarWidth] = useLocalStorage(SIDEBAR_STORAGE_KEY, 320);
  const [isSidebarOpen, setIsSidebarOpen] = useLocalStorage(SIDEBAR_OPEN_KEY, true);
  const [planEpicKeys, setPlanEpicKeys] = useState<string[]>([]);
  const [selectedEpicKey, setSelectedEpicKey] = useState<string | null>(null);
  const [storyPhases, setStoryPhases] = useState<StoryPhasesByStory>({});
  const [storyEvents, setStoryEvents] = useState<StoryEventsByStory>({});
  const [excludedStoryKeys, setExcludedStoryKeys] = useState<string[]>([]);
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [epics, setEpics] = useState<EpicListItem[]>([]);
  const [epicsLoading, setEpicsLoading] = useState(false);
  const [, setEpicsError] = useState<string | null>(null);

  const handleQuarterChange = useCallback((y: number, q: Quarter) => {
    setYear(y);
    setQuarter(q);
    setIsEditingPlan(false);
  }, []);

  const { planData, isLoadingPlan, savePlan } = useQuarterlyPlanV2(
    boardId,
    year,
    quarter
  );

  useEffect(() => {
    let cancelled = false;

    async function loadEpics() {
      setEpicsLoading(true);
      setEpicsError(null);
      try {
        const epicItems = await fetchEpicsList(boardId, { perPage: 500 });
        if (!cancelled) {
          setEpics(epicItems);
        }
      } catch (error) {
        console.error('Failed to load epics for quarterly planning:', error);
        if (!cancelled) {
          setEpicsError(t('planning.quarterlyV2.loadEpicsFailed'));
          setEpics([]);
        }
      } finally {
        if (!cancelled) {
          setEpicsLoading(false);
        }
      }
    }

    if (boardId) {
      loadEpics();
    }

    return () => {
      cancelled = true;
    };
  }, [boardId, t]);

  useEffect(() => {
    if (!planData) return;
    startTransition(() => {
      setPlanEpicKeys(planData.epicKeys);
      setStoryPhases(normalizeStoryPhasesFromApi(planData.storyPhases));
      setStoryEvents(normalizeStoryEventsFromApi(planData.storyEvents ?? {}));
      setExcludedStoryKeys(planData.excludedStoryKeys ?? []);
    });
  }, [planData]);

  const persistPlan = useCallback(
    (
      epicKeys: string[],
      phases: StoryPhasesByStory,
      excluded: string[],
      events: StoryEventsByStory
    ) => {
      savePlan(
        epicKeys,
        flattenStoryPhasesForApi(phases),
        excluded,
        flattenStoryEventsForApi(events)
      ).catch((err) => {
        console.error('Failed to save quarterly plan:', err);
      });
    },
    [savePlan]
  );

  const planEpicKeysSet = useMemo(() => new Set(planEpicKeys), [planEpicKeys]);

  const { data: sprints = [], isLoading: sprintsLoading } = useSprints(boardId);

  const epicDetailsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        epicKey: string;
        epicName: string;
        epicOriginalStatus?: string;
        epicPriority?: string;
        epicType?: string;
      }
    >();
    for (const key of planEpicKeys) {
      const epic = epics.find((e) => e.id === key);
      map.set(key, {
        epicKey: key,
        epicName: epic?.name ?? key,
        epicOriginalStatus: epic?.originalStatus,
        epicPriority: (epic as { priority?: string })?.priority,
        epicType: epic?.type,
      });
    }
    return map;
  }, [planEpicKeys, epics]);

  const handleStoryPhasesChange = useCallback(
    (storyKey: string, phases: StoryPhasePosition[]) => {
      const next = { ...storyPhases };
      if (phases.length > 0) next[storyKey] = phases;
      else delete next[storyKey];
      setStoryPhases(next);
      persistPlan(planEpicKeys, next, excludedStoryKeys, storyEvents);
    },
    [planEpicKeys, persistPlan, storyPhases, storyEvents, excludedStoryKeys]
  );

  const handleStoryEventsChange = useCallback(
    (storyKey: string, weekIndex: number, kind: QuarterlyStoryEventKind | null) => {
      setStoryEvents((prev) => {
        const next =
          kind == null
            ? removeStoryWeekEvent(prev, storyKey, weekIndex)
            : upsertStoryWeekEvent(prev, storyKey, weekIndex, kind);
        void persistPlan(planEpicKeys, storyPhases, excludedStoryKeys, next);
        return next;
      });
    },
    [planEpicKeys, persistPlan, storyPhases, excludedStoryKeys]
  );

  const {
    isLoading: plannerDataLoading,
    sprintInfos,
    storyPhasesByStory,
    tasks,
  } = useEpicStoriesOccupancyData({
    epicDetailsMap,
    planEpicKeys,
    excludedStoryKeys,
    quarter: quarter as 1 | 2 | 3 | 4,
    sprints,
    storyPhases,
    year,
  });

  const handleAddEpic = useCallback(
    (epicKey: string) => {
      const nextKeys = planEpicKeys.includes(epicKey)
        ? planEpicKeys
        : [...planEpicKeys, epicKey];
      setPlanEpicKeys(nextKeys);
      if (!selectedEpicKey) setSelectedEpicKey(epicKey);
      persistPlan(nextKeys, storyPhases, excludedStoryKeys, storyEvents);
    },
    [planEpicKeys, persistPlan, selectedEpicKey, storyPhases, storyEvents, excludedStoryKeys]
  );

  const { confirm, DialogComponent: removeFromPlanConfirmDialog } = useConfirmDialog();

  const performRemoveTaskFromPlan = useCallback(
    (task: Task) => {
      const next = removeTaskFromQuarterlyPlan(
        { planEpicKeys, storyPhases, storyEvents, excludedStoryKeys },
        task,
        tasks
      );
      setPlanEpicKeys(next.planEpicKeys);
      setStoryPhases(next.storyPhases);
      setStoryEvents(next.storyEvents);
      setExcludedStoryKeys(next.excludedStoryKeys);
      persistPlan(
        next.planEpicKeys,
        next.storyPhases,
        next.excludedStoryKeys,
        next.storyEvents
      );
    },
    [planEpicKeys, storyPhases, storyEvents, excludedStoryKeys, tasks, persistPlan]
  );

  const handleRemoveTaskFromPlan = useCallback(
    async (task: Task) => {
      const displayKey = task.originalTaskId?.trim() || task.id;
      const label = formatQuarterlyTaskTitleLabel(
        displayKey,
        task.name,
        t('task.card.untitled')
      );
      const parentEpicKey = task.parent?.key?.trim() || task.parent?.id?.trim();
      const isEpicRow = !parentEpicKey && planEpicKeys.includes(task.id);
      const message = isEpicRow
        ? t('planning.quarterlyV2.removeEpicFromPlanConfirmMessage', { task: label })
        : t('planning.quarterlyV2.removeFromPlanConfirmMessage', { task: label });

      const confirmed = await confirm(message, {
        title: t('planning.quarterlyV2.removeFromPlanConfirmTitle'),
        variant: 'destructive',
        confirmText: t('planning.quarterlyV2.removeFromPlanTitle'),
      });
      if (!confirmed) return;

      performRemoveTaskFromPlan(task);
    },
    [confirm, performRemoveTaskFromPlan, planEpicKeys, t]
  );

  const isLoading = epicsLoading || sprintsLoading || isLoadingPlan;

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      <LoadingOverlay isVisible={isLoading} message={t('planning.quarterlyV2.loadingOverlay')} />

      <div
        className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100"
        role="status"
      >
        {t('common.deprecatedFeatureNotice')}
      </div>
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <QuarterSelector
            quarter={quarter}
            year={year}
            onQuarterChange={handleQuarterChange}
          />
          {planEpicKeys.length > 0 ? (
            <QuarterlyPlannerEditModeToolbar
              isEditingPlan={isEditingPlan}
              onEditingPlanChange={setIsEditingPlan}
            />
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {planEpicKeys.length > 0 ? <QuarterlyPlannerHelpPopover /> : null}
          <Button
            aria-label={t('planning.quarterlyV2.toggleEpicsSidebarAria')}
            aria-pressed={isSidebarOpen}
            className={`!h-8 shrink-0 !gap-2 !px-2.5 ${
              isSidebarOpen
                ? ''
                : 'text-gray-600 dark:text-gray-400'
            }`}
            title={t('planning.quarterlyV2.toggleEpicsSidebarTitle')}
            type="button"
            variant={isSidebarOpen ? 'accent' : 'outline'}
            onClick={() => setIsSidebarOpen((prev) => !prev)}
          >
            <Icon className="h-4 w-4 shrink-0" name="menu" />
            <span className="hidden text-xs font-medium sm:inline">
              {t('planning.quarterlyV2.epicsSidebarTitle')}
            </span>
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {planEpicKeys.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
              {t('planning.quarterlyV2.emptyPlanHint')}
            </div>
          ) : (
            <QuarterlyPlannerView
              boardId={boardId}
              isEditingPlan={isEditingPlan}
              isLoading={plannerDataLoading}
              sprintInfos={sprintInfos}
              sprints={sprints}
              storyEventsByStory={storyEvents}
              storyPhasesByStory={storyPhasesByStory}
              tasks={tasks}
              onRemoveTaskFromPlan={handleRemoveTaskFromPlan}
              onStoryEventsChange={handleStoryEventsChange}
              onStoryPhasesChange={handleStoryPhasesChange}
            />
          )}
        </div>

        <ResizableSidebar
          isOpen={isSidebarOpen}
          maxWidth={500}
          minWidth={240}
          resizeHandleSide="left"
          width={sidebarWidth}
          onToggle={() => setIsSidebarOpen((prev) => !prev)}
          onWidthChange={setSidebarWidth}
        >
          <EpicsSidebar
            epics={epics}
            planEpicKeys={planEpicKeysSet}
            onAddEpic={handleAddEpic}
          />
        </ResizableSidebar>
      </div>
      {removeFromPlanConfirmDialog}
    </div>
  );
}
