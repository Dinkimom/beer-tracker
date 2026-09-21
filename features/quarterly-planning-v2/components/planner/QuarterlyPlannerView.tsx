'use client';

import type {
  QuarterlySprintInfo,
  QuarterlyStoryEventKind,
  StoryEventsByStory,
  StoryPhasePosition,
  StoryPhasesByStory,
} from '../../types';
import type { Task } from '@/types';
import type { SprintListItem } from '@/types/tracker';

import { useCallback, useMemo, useState } from 'react';

import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { TransitionFieldsModal } from '@/features/sprint/components/SprintPlanner/components/TransitionFieldsModal';

import { usePlannedInSprintPositions } from '../../hooks/usePlannedInSprintPositions';
import { useQuarterlyEpicPointsByKey } from '../../hooks/useQuarterlyEpicPoints';
import { useQuarterlyPlannerResize } from '../../hooks/useQuarterlyPlannerResize';
import { useQuarterlyPlannerStatusChange } from '../../hooks/useQuarterlyPlannerStatusChange';
import { useQuarterlyPlannerTableDimensions } from '../../hooks/useQuarterlyPlannerTableDimensions';
import { useQuarterlyStatusColumnWidth } from '../../hooks/useQuarterlyStatusColumnWidth';
import { buildQuarterlyFlatRows } from '../../utils/buildQuarterlyFlatRows';
import {
  getQuarterlyDevelopmentPlanParentKind,
  isQuarterlyPlannerDevelopmentPlanRow,
} from '../../utils/quarterlyDevelopmentPlanRow';

import { QuarterlyPlannerTable } from './QuarterlyPlannerTable';
import { QuarterlyStoryDevelopmentPlanModal } from './QuarterlyStoryDevelopmentPlanModal';
import { renderQuarterlyPlannerTaskCells } from './renderQuarterlyPlannerTaskCells';

interface QuarterlyPlannerViewProps {
  boardId: number;
  isEditingPlan: boolean;
  isLoading?: boolean;
  sprintInfos: QuarterlySprintInfo[];
  sprints: SprintListItem[];
  storyEventsByStory: StoryEventsByStory;
  storyPhasesByStory: StoryPhasesByStory;
  tasks: Task[];
  onRemoveTaskFromPlan?: (task: Task) => void;
  onStoryEventsChange: (
    storyKey: string,
    weekIndex: number,
    kind: QuarterlyStoryEventKind | null
  ) => void;
  onStoryPhasesChange: (storyKey: string, phases: StoryPhasePosition[]) => void;
}

export function QuarterlyPlannerView({
  boardId,
  tasks: sourceTasks,
  storyPhasesByStory,
  storyEventsByStory,
  sprintInfos,
  sprints,
  isEditingPlan,
  onStoryPhasesChange,
  onStoryEventsChange,
  onRemoveTaskFromPlan,
  isLoading = false,
}: QuarterlyPlannerViewProps) {
  const { t, language } = useI18n();
  const {
    tasks,
    transitionModal,
    handleStatusChangeWithModal,
    closeTransitionModal,
    handleTransitionSubmit,
  } = useQuarterlyPlannerStatusChange(sourceTasks, sprints);
  const dateLocale = language === 'en' ? 'en-US' : 'ru-RU';
  const { isResizing, setIsResizing, tableScrollRef, taskColumnWidth } = useQuarterlyPlannerResize();
  const { statusColumnWidth, statusColumnWidthMeasurer } =
    useQuarterlyStatusColumnWidth(tasks);
  const { dayColumnWidth, tableWidth, weekColumns, weekCount } =
    useQuarterlyPlannerTableDimensions({
      sprintInfos,
      tableScrollRef,
      taskColumnWidth,
      statusColumnWidth,
    });

  const visibleRows = useMemo(() => buildQuarterlyFlatRows(tasks), [tasks]);

  const epicKeysInPlan = useMemo(
    () =>
      tasks
        .filter((task) => getQuarterlyDevelopmentPlanParentKind(task) === 'epic')
        .map((task) => task.id),
    [tasks]
  );
  const storyKeysInPlan = useMemo(
    () =>
      tasks
        .filter((task) => getQuarterlyDevelopmentPlanParentKind(task) === 'story')
        .map((task) => task.id),
    [tasks]
  );
  const epicPointsByKey = useQuarterlyEpicPointsByKey(boardId, epicKeysInPlan);
  const { plannedInSprintPositions } = usePlannedInSprintPositions(
    boardId,
    storyKeysInPlan,
    epicKeysInPlan,
    sprintInfos
  );

  const [developmentPlanTarget, setDevelopmentPlanTarget] = useState<{
    key: string;
    kind: 'epic' | 'story';
    name: string;
  } | null>(null);

  const openDevelopmentPlan = useCallback((task: Task) => {
    const kind = getQuarterlyDevelopmentPlanParentKind(task);
    if (!kind) return;
    setDevelopmentPlanTarget({
      key: task.id,
      kind,
      name: task.name?.trim() || task.id,
    });
  }, []);

  const currentSprintIndex = useMemo(() => {
    return sprintInfos.findIndex((s) => {
      if (s.isUnregistered) return false;
      const start = new Date(s.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(s.endDate ?? s.startDate);
      end.setHours(23, 59, 59, 999);
      const now = new Date();
      return now >= start && now <= end;
    });
  }, [sprintInfos]);

  return (
    <div className="relative flex flex-1 min-w-0 min-h-0 flex-col overflow-hidden bg-white dark:bg-gray-800">
      {statusColumnWidthMeasurer}
      {isLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80"
          style={{ zIndex: ZIndex.overlay }}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t('planning.quarterlyV2.loadingOverlay')}
            </span>
          </div>
        </div>
      )}

      <div
        ref={tableScrollRef}
        className="flex w-full min-w-0 flex-1 flex-col overflow-y-auto overflow-x-auto relative scrollbar-thin-custom"
      >
        <div
          className="relative box-border w-full max-w-none shrink-0"
          style={
            tableWidth != null
              ? { minWidth: `max(100%, ${tableWidth}px)`, overflowX: 'clip' as const }
              : undefined
          }
        >
          <QuarterlyPlannerTable
            currentSprintIndex={currentSprintIndex}
            dateLocale={dateLocale}
            dayColumnWidth={dayColumnWidth}
            isEditingPlan={isEditingPlan}
            isResizing={isResizing}
            plannedInSprintPositions={plannedInSprintPositions}
            renderTaskCells={({
              displayKey,
              task,
              taskColumnWidth: colW,
              rowHeightPx,
              rowSpan,
              sizeToContent,
              onRemoveFromPlan,
            }) =>
              renderQuarterlyPlannerTaskCells({
                displayKey,
                statusColumnWidth,
                taskColumnWidth: colW,
                rowHeightPx,
                rowSpan,
                sizeToContent,
                epicPoints:
                  getQuarterlyDevelopmentPlanParentKind(task) === 'epic'
                    ? epicPointsByKey.get(task.id)
                    : undefined,
                onRemoveFromPlan,
                onShowDevelopmentPlan: isQuarterlyPlannerDevelopmentPlanRow(task)
                  ? () => openDevelopmentPlan(task)
                  : undefined,
                task,
                onStatusChange: (transitionId, targetStatusKey, targetStatusDisplay, screenId) =>
                  handleStatusChangeWithModal(
                    task.id,
                    transitionId,
                    targetStatusKey,
                    targetStatusDisplay,
                    screenId
                  ),
                status: task.originalStatus,
                statusColorKey: task.statusColorKey,
                taskName: task.name,
                taskType: task.type,
              })
            }
            setIsResizing={setIsResizing}
            sprintInfos={sprintInfos}
            statusColumnWidth={statusColumnWidth}
            storyEventsByStory={storyEventsByStory}
            storyPhasesByStory={storyPhasesByStory}
            taskColumnWidth={taskColumnWidth}
            visibleRows={visibleRows}
            weekColumnWidth={dayColumnWidth}
            weekColumns={weekColumns}
            weekCount={weekCount}
            onRemoveTaskFromPlan={onRemoveTaskFromPlan}
            onStoryEventsChange={onStoryEventsChange}
            onStoryPhasesChange={onStoryPhasesChange}
          />
        </div>
      </div>

      <QuarterlyStoryDevelopmentPlanModal
        boardId={boardId}
        open={developmentPlanTarget != null}
        parentKey={developmentPlanTarget?.key ?? null}
        parentKind={developmentPlanTarget?.kind ?? null}
        parentName={developmentPlanTarget?.name ?? ''}
        sprintInfos={sprintInfos}
        onOpenChange={(next) => {
          if (!next) setDevelopmentPlanTarget(null);
        }}
      />

      {transitionModal ? (
        <TransitionFieldsModal
          fields={transitionModal.fields}
          isOpen
          sprints={sprints}
          targetStatusDisplay={transitionModal.targetStatusDisplay}
          targetStatusKey={transitionModal.targetStatusKey}
          task={transitionModal.task}
          onClose={closeTransitionModal}
          onSubmit={handleTransitionSubmit}
        />
      ) : null}
    </div>
  );
}
