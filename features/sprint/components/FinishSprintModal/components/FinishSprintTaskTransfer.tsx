/**
 * Компонент выбора переноса задач при завершении спринта
 */

import type { MoveTasksTo } from '@/types';
import type { SprintListItem } from '@/types/tracker';

import { CustomSelect, type CustomSelectOption } from '@/components/CustomSelect';
import { useI18n } from '@/contexts/LanguageContext';
import { SprintCustomSelect } from '@/features/sprint/components/SprintCustomSelect';

interface FinishSprintTaskTransferProps {
  draftSprints: SprintListItem[];
  moveTasksTo: MoveTasksTo;
  selectedSprintId: number | null;
  onMoveTasksToChange: (value: MoveTasksTo) => void;
  onSelectedSprintIdChange: (sprintId: number | null) => void;
}

export function FinishSprintTaskTransfer({
  draftSprints,
  moveTasksTo,
  selectedSprintId,
  onMoveTasksToChange,
  onSelectedSprintIdChange,
}: FinishSprintTaskTransferProps) {
  const { t } = useI18n();
  const moveTaskOptions: CustomSelectOption<MoveTasksTo>[] = [
    { label: t('task.finishSprint.toBacklog'), value: 'backlog' },
    { label: t('task.finishSprint.toSprint'), value: 'sprint' },
  ];

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
        {t('task.finishSprint.transferTitle')}
      </h3>
      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('task.finishSprint.moveToLabel')}
          </label>
          <CustomSelect<MoveTasksTo>
            options={moveTaskOptions}
            value={moveTasksTo}
            onChange={(value) => {
              onMoveTasksToChange(value);
              if (value === 'backlog') {
                onSelectedSprintIdChange(null);
              }
            }}
          />
        </div>
        {moveTasksTo === 'sprint' && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('task.finishSprint.targetSprintLabel')}
            </label>
            <SprintCustomSelect
              emptyPlaceholder={t('task.finishSprint.noDraftSprints')}
              placeholder={t('task.finishSprint.selectSprint')}
              selectedSprintId={selectedSprintId}
              sprints={draftSprints}
              onChange={onSelectedSprintIdChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
