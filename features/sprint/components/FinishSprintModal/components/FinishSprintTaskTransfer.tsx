/**
 * Компонент выбора переноса задач при завершении спринта
 */

import type { MoveTasksTo } from '@/types';
import type { SprintListItem } from '@/types/tracker';

import { CustomSelect, type CustomSelectOption } from '@/components/CustomSelect';
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
  const moveTaskOptions: CustomSelectOption<MoveTasksTo>[] = [
    { label: 'В бэклог', value: 'backlog' },
    { label: 'В спринт', value: 'sprint' },
  ];

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Перенести незавершенные задачи
      </h3>
      <div className="space-y-3 max-w-md">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Куда переносить
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
              Целевой спринт
            </label>
            <SprintCustomSelect
              emptyPlaceholder="Нет доступных draft-спринтов"
              placeholder="Выберите спринт"
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
