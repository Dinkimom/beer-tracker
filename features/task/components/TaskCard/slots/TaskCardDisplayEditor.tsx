'use client';

import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/Button';
import { useI18n } from '@/contexts/LanguageContext';
import { useCommitTaskCardSlotLayout } from '@/hooks/useLocalStorage';
import { useProductTenantOrganizations } from '@/hooks/useProductTenantOrganizations';
import { fetchPlannerTrackerFields } from '@/lib/api/plannerTrackerFields';
import {
  defaultTaskCardSlotLayout,
  taskCardSlotLayoutsEqual,
  type TaskCardBoard,
} from '@/lib/taskCard/taskCardSlots';

import { TaskCardDisplaySettingsPanel } from './TaskCardDisplaySettingsPanel';

function trackerFieldsStatus(
  organizationId: string | null,
  isError: boolean,
  isLoading: boolean
): 'loading' | 'ready' | 'unavailable' {
  if (isLoading) {
    return 'loading';
  }
  if (!organizationId || isError) {
    return 'unavailable';
  }
  return 'ready';
}

/**
 * Настройка отображения карточки задачи для доски: поля трекера, раскладка слотов и сброс к умолчанию.
 * Одно содержимое для окна с доски («Слои») и экрана в настройках.
 */
export function TaskCardDisplayEditor({ board = 'swimlane' }: { board?: TaskCardBoard }) {
  const { t } = useI18n();
  const { commit, layout } = useCommitTaskCardSlotLayout(board);
  const { activeOrganizationId, sessionLoading } = useProductTenantOrganizations({ pollIntervalMs: 0 });
  const fieldsQuery = useQuery({
    enabled: Boolean(activeOrganizationId),
    queryFn: () => fetchPlannerTrackerFields(activeOrganizationId ?? ''),
    queryKey: ['planner-tracker-fields', activeOrganizationId],
    staleTime: 5 * 60 * 1000,
  });

  return (
    <TaskCardDisplaySettingsPanel
      board={board}
      fields={fieldsQuery.data ?? []}
      fieldsStatus={trackerFieldsStatus(
        activeOrganizationId,
        fieldsQuery.isError,
        fieldsQuery.isLoading || sessionLoading
      )}
      hintAction={
        <Button
          className="shrink-0"
          disabled={taskCardSlotLayoutsEqual(layout, defaultTaskCardSlotLayout(board))}
          title={t('settings.planningTab.cardSlots.resetHint')}
          variant="outline"
          onClick={() => {
            commit(defaultTaskCardSlotLayout(board));
          }}
        >
          {t('settings.planningTab.cardSlots.reset')}
        </Button>
      }
      layout={layout}
      organizationId={activeOrganizationId}
      onChange={commit}
    />
  );
}
