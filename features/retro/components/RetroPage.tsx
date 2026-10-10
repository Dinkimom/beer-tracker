'use client';

import type { Task } from '@/types';
import type { SprintListItem } from '@/types/tracker';

import { useLayoutEffect, useMemo, useState } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { FLOATING_TOOLBAR_GLASS } from '@/features/context-menu/contextMenuClasses';
import { useRetroBoardCollaboration } from '@/features/retro/hooks/useRetroBoardCollaboration';
import { SprintScoreBlock } from '@/features/sidebar/components/tabs/SprintScoreBlock';
import { SprintPlannerPresenceAvatars } from '@/features/sprint/components/SprintPlanner/components/SprintPlannerPresenceAvatars';
import { SprintPlannerTimer } from '@/features/sprint/components/SprintPlanner/components/SprintPlannerTimer';
import { SprintSelectorWithCreate } from '@/features/sprint/components/SprintSelectorWithCreate';
import { STORAGE_KEYS } from '@/hooks/localStorage/storageKeys';
import { useDebouncedNumericLocalStorage } from '@/hooks/localStorage/useDebouncedNumericLocalStorage';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { usePlannerIntegrationRules } from '@/hooks/usePlannerIntegrationRules';
import { useProductTenantOrganizations } from '@/hooks/useProductTenantOrganizations';
import { resolveAdjacentSprintIds } from '@/lib/retro/retroBoard';
import { sprintTaskCompletionRulesFromPlanner } from '@/lib/sprints/sprintTaskCompletion';

import { RetroBoardView } from './RetroBoardView';
import { RetroFactsBlock } from './RetroFactsBlock';
import { RetroMetricsSidebar } from './RetroMetricsSidebar';

interface RetroPageProps {
  boardId: number;
  goalTaskIds: string[];
  selectedSprintId: number | null;
  sprints: SprintListItem[];
  sprintsLoading: boolean;
  tasks: Task[];
  tasksPending: boolean;
  onSprintChange: (sprintId: number | null) => void;
}

export function RetroPage({
  boardId,
  goalTaskIds,
  selectedSprintId,
  sprints,
  sprintsLoading,
  tasks,
  tasksPending,
  onSprintChange,
}: RetroPageProps) {
  const { t } = useI18n();
  const { activeOrganizationId } = useProductTenantOrganizations({ pollIntervalMs: 0 });
  const { data: plannerRules } = usePlannerIntegrationRules(activeOrganizationId);
  const completionRules = useMemo(
    () => sprintTaskCompletionRulesFromPlanner(plannerRules),
    [plannerRules]
  );
  const tasksForScore = tasksPending ? undefined : tasks;
  const selectedSprint = useMemo(
    () => sprints.find((sprint) => sprint.id === selectedSprintId) ?? null,
    [selectedSprintId, sprints]
  );
  const previousSprintId = useMemo(
    () => (selectedSprintId == null ? null : resolveAdjacentSprintIds(sprints, selectedSprintId).previousSprintId),
    [selectedSprintId, sprints]
  );
  const boardViewers = useRetroBoardCollaboration(selectedSprintId, previousSprintId);
  const [metricsOpen, setMetricsOpen] = useLocalStorage(STORAGE_KEYS.RETRO_METRICS_OPEN, true);
  const [metricsWidth, setMetricsWidth] = useDebouncedNumericLocalStorage(STORAGE_KEYS.RETRO_METRICS_WIDTH, 320);
  const [boardFrameEl, setBoardFrameEl] = useState<HTMLDivElement | null>(null);
  const [controlsEl, setControlsEl] = useState<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const frame = boardFrameEl;
    const bar = controlsEl;
    if (!frame || !bar) return undefined;
    const apply = () => {
      frame.style.setProperty('--retro-controls-h', `${bar.offsetHeight}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(bar);
    return () => observer.disconnect();
  }, [boardFrameEl, controlsEl]);

  return (
    <div
      className="relative flex min-h-0 flex-1 gap-3 overflow-hidden"
      style={{ width: '100%', height: '100%' }}
    >
      <div
        ref={setBoardFrameEl}
        className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-ds-surface-header"
      >
        <div
          className="absolute inset-0 flex min-h-0 flex-col overflow-hidden dark:bg-transparent"
          style={{ zIndex: ZIndex.base }}
        >
          {selectedSprintId == null ? (
            <div
              className="flex min-h-0 flex-1 items-center justify-center px-6 text-sm text-gray-500 dark:text-gray-400"
              style={{ paddingTop: 'var(--retro-controls-h, 0px)' }}
            >
              {t('retro.selectSprint')}
            </div>
          ) : (
            <RetroBoardView
              organizationId={activeOrganizationId}
              sprintId={selectedSprintId}
              sprints={sprints}
            />
          )}
        </div>

        <div
          ref={setControlsEl}
          className={`absolute inset-x-0 top-0 ${FLOATING_TOOLBAR_GLASS}`}
          style={{ zIndex: ZIndex.plannerControls }}
        >
          <div className="relative z-10 flex shrink-0 items-center justify-between gap-4 border-b border-transparent px-4 py-3">
            <SprintSelectorWithCreate
              boardId={boardId}
              selectedSprintId={selectedSprintId}
              sprints={sprints}
              sprintsLoading={sprintsLoading}
              surface="glass"
              onSprintChange={onSprintChange}
            />
            <div className="flex shrink-0 items-center gap-2">
              <SprintPlannerPresenceAvatars viewers={boardViewers} />
              <SprintPlannerTimer selectedSprintId={selectedSprintId} surface="glass" />
              {selectedSprintId == null ? null : (
                <Button
                  aria-label={metricsOpen ? t('retro.hideMetrics') : t('retro.showMetrics')}
                  aria-pressed={metricsOpen}
                  className={`!h-8 !w-8 !min-w-0 shrink-0 !justify-center !px-0 ${
                    metricsOpen ? '' : 'text-gray-600 dark:text-gray-400'
                  }`}
                  title={metricsOpen ? t('retro.hideMetrics') : t('retro.showMetrics')}
                  type="button"
                  variant={metricsOpen ? 'accent' : 'outline'}
                  onClick={() => setMetricsOpen(!metricsOpen)}
                >
                  <Icon className="h-4 w-4" name="menu" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedSprintId == null ? null : (
        <RetroMetricsSidebar
          open={metricsOpen}
          width={metricsWidth}
          onOpenChange={setMetricsOpen}
          onWidthChange={setMetricsWidth}
        >
          <SprintScoreBlock
            completionRules={completionRules}
            goalTaskIds={goalTaskIds}
            localTasks={tasksForScore}
            sprintId={selectedSprintId}
          />
          <RetroFactsBlock
            key={selectedSprintId}
            completionRules={completionRules}
            sprint={selectedSprint}
            tasks={tasksForScore}
            tasksPending={tasksPending}
          />
        </RetroMetricsSidebar>
      )}
    </div>
  );
}
