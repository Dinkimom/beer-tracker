'use client';

import type { Task } from '@/types';
import type { SprintListItem } from '@/types/tracker';

import { useMemo } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
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

  return (
    <div
      className="relative flex min-h-0 flex-1 gap-3 overflow-hidden"
      style={{ width: '100%', height: '100%' }}
    >
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
        <div className="flex shrink-0 items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-ds-surface-header">
          <SprintSelectorWithCreate
            boardId={boardId}
            selectedSprintId={selectedSprintId}
            sprints={sprints}
            sprintsLoading={sprintsLoading}
            onSprintChange={onSprintChange}
          />
          <div className="flex shrink-0 items-center gap-2">
            <SprintPlannerPresenceAvatars viewers={boardViewers} />
            <SprintPlannerTimer selectedSprintId={selectedSprintId} />
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

        {selectedSprintId == null ? (
          <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-sm text-gray-500 dark:text-gray-400">
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
