/**
 * Компонент кнопки создания QA задачи для TaskBar
 */

'use client';

import type { Task } from '@/types';

import { Button } from '@/components/Button';
import { useI18n } from '@/contexts/LanguageContext';

import { TaskBarQACreateIcon } from './TaskBarQACreateIcon';

interface TaskBarQACreateAvailabilityInput {
  hasQATaskInSwimlane: boolean;
  isDragging: boolean;
  isInError?: boolean;
  isQATask: boolean;
  isSelected: boolean;
  task: Task;
  onCreateQATask?: (taskId: string, anchorRect?: DOMRect) => void;
}

/** Кнопку «добавить QA» показываем только у dev-задачи с тест-оценкой и без QA в свимлейне. */
export function isTaskBarQACreateAvailable({
  hasQATaskInSwimlane,
  isDragging,
  isInError,
  isQATask,
  isSelected,
  onCreateQATask,
  task,
}: TaskBarQACreateAvailabilityInput): boolean {
  return !(
    isQATask ||
    task.hideTestPointsByIntegration === true ||
    task.testPoints === undefined ||
    task.testPoints <= 0 ||
    !onCreateQATask ||
    task.team === 'QA' ||
    hasQATaskInSwimlane ||
    isSelected ||
    isDragging ||
    isInError
  );
}

interface TaskBarQACreateButtonProps {
  task: Task;
  onCreateQATask: (taskId: string, anchorRect?: DOMRect) => void;
}

/**
 * Положение и видимость задаёт правая рейка карточки (TaskBarCornerBadges,
 * через isTaskBarQACreateAvailable); здесь только вид кнопки.
 */
export function TaskBarQACreateButton({ onCreateQATask, task }: TaskBarQACreateButtonProps) {
  const { t } = useI18n();

  return (
    <Button
      aria-label={t('task.taskBar.addQaTaskTitle')}
      className="task-card-swimlane-corner-badge pointer-events-auto !h-[18px] !w-[18px] !min-h-0 !min-w-0 shrink-0 !justify-center !rounded-md !border !border-amber-300/90 !bg-amber-50 !p-0 !text-amber-700 shadow-sm scale-100 hover:!scale-125 hover:!border-amber-400 hover:!bg-amber-100 hover:!text-amber-800 active:!scale-[0.98] dark:!border-gray-800 dark:!bg-amber-500 dark:!text-white dark:hover:!bg-amber-600"
      title={t('task.taskBar.addQaTaskTitle')}
      type="button"
      variant="ghost"
      onClick={(e) => {
        e.stopPropagation();
        const el = e.currentTarget;
        onCreateQATask(task.id, el.getBoundingClientRect());
      }}
    >
      <TaskBarQACreateIcon className="h-3 w-3" />
    </Button>
  );
}

