'use client';

import type { BoardViewMode } from '@/hooks/useLocalStorage';
import type { SprintPresenceViewer } from '@/lib/realtime/sprintRealtimeTypes';

import { Button } from '@/components/Button';
import { CustomSelect } from '@/components/CustomSelect';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { useSprintPresenceReveal } from '@/hooks/useSprintPresenceReveal';

import { usePlannerOnboardingReplay } from '../onboarding/plannerOnboardingChrome';

import { PlannerHistoryControls } from './PlannerHistoryControls';
import {
  applyControlsBarViewModeChange,
  type ControlsBarViewModeSelectValue,
} from './sprintPlannerControlsBarHelpers';
import { SprintPlannerPresenceAvatars } from './SprintPlannerPresenceAvatars';
import { SprintPlannerTimer } from './SprintPlannerTimer';

interface SprintPlannerControlsBarRightSectionProps {
  boardViewers: readonly SprintPresenceViewer[];
  isReloading: boolean;
  planHistory?: {
    canRedo: boolean;
    canUndo: boolean;
    redo: () => void;
    undo: () => void;
  };
  selectedSprintId: number | null;
  sidebarOpen: boolean;
  tasksReloadButtonTitle: string;
  viewMode: BoardViewMode;
  viewModeSelectValue: ControlsBarViewModeSelectValue;
  onOpenSidebar?: () => void;
  onTasksReload?: (options?: { showToast?: boolean }) => void;
  setViewMode: (value: BoardViewMode | ((prev: BoardViewMode) => BoardViewMode)) => void;
}

export function SprintPlannerControlsBarRightSection({
  boardViewers,
  isReloading,
  onOpenSidebar,
  onTasksReload,
  planHistory,
  selectedSprintId,
  setViewMode,
  sidebarOpen,
  tasksReloadButtonTitle,
  viewMode,
  viewModeSelectValue,
}: SprintPlannerControlsBarRightSectionProps) {
  const { t } = useI18n();
  const replayOnboarding = usePlannerOnboardingReplay();
  const revealViewer = useSprintPresenceReveal({ setViewMode, viewMode });

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 sm:ml-auto sm:justify-end">
      <div className="flex min-h-8 flex-wrap items-center gap-2">
        <SprintPlannerPresenceAvatars viewers={boardViewers} onRevealViewer={revealViewer} />
        <SprintPlannerTimer selectedSprintId={selectedSprintId} />
        {planHistory && viewMode !== 'kanban' && (
          <PlannerHistoryControls
            canRedo={planHistory.canRedo}
            canUndo={planHistory.canUndo}
            className="!border-0 !bg-transparent !p-0 !shadow-none"
            onRedo={planHistory.redo}
            onUndo={planHistory.undo}
          />
        )}
        {onTasksReload ? (
          <Button
            aria-label={tasksReloadButtonTitle}
            className="!h-8 !w-8 !min-w-0 shrink-0 !justify-center !px-0 text-gray-600 dark:text-gray-400"
            disabled={isReloading || !selectedSprintId}
            title={tasksReloadButtonTitle}
            type="button"
            variant="outline"
            onClick={() => onTasksReload({ showToast: true })}
          >
            <Icon className={`h-4 w-4 ${isReloading ? 'animate-spin' : ''}`} name="refresh" />
          </Button>
        ) : null}
        {replayOnboarding ? (
          <Button
            aria-label={t('sprintPlanner.onboarding.replay')}
            className="!h-8 !w-8 !min-w-0 shrink-0 !justify-center !px-0 text-gray-600 dark:text-gray-400"
            title={t('sprintPlanner.onboarding.replay')}
            type="button"
            variant="outline"
            onClick={replayOnboarding}
          >
            <Icon className="h-4 w-4" name="circle-help" />
          </Button>
        ) : null}
        <div className="shrink-0" data-onboarding="view-mode">
        <CustomSelect<ControlsBarViewModeSelectValue>
          className="w-[148px] shrink-0 md:w-[165px]"
          options={[
            { label: t('sprintPlanner.controls.viewByAssignees'), value: 'swimlanes' },
            { label: t('sprintPlanner.controls.viewByFeatures'), value: 'features' },
            { label: t('sprintPlanner.controls.viewKanban'), value: 'kanban' },
          ]}
          size="compact"
          title={t('sprintPlanner.controls.viewModeTitle')}
          value={viewModeSelectValue}
          onChange={(v) => applyControlsBarViewModeChange(v, setViewMode)}
        />
        </div>
        {onOpenSidebar && (
          <Button
            aria-label={t('sprintPlanner.controls.sidebarToggle')}
            aria-pressed={sidebarOpen}
            className={`!h-8 !w-8 !min-w-0 shrink-0 !justify-center !px-0 ${
              sidebarOpen ? '' : 'text-gray-600 dark:text-gray-400'
            }`}
            title={t('sprintPlanner.controls.sidebarToggle')}
            type="button"
            variant={sidebarOpen ? 'accent' : 'outline'}
            onClick={onOpenSidebar}
          >
            <Icon className="h-4 w-4" name="menu" />
          </Button>
        )}
      </div>
    </div>
  );
}
