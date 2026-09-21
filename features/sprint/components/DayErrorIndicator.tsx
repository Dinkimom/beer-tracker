'use client';

import type { DayErrorDetail } from '@/features/sprint/utils/occupancyValidation';
import type { Task } from '@/types';

import { useMemo } from 'react';

import { Icon } from '@/components/Icon';
import { TextTooltip } from '@/components/TextTooltip';

interface DayErrorIndicatorProps {
  /** Список проблемных задач и причин для тултипа */
  errorDetails?: DayErrorDetail[];
  /** Список задач для поиска taskId по taskName */
  tasks?: Task[];
  /** Callback для изменения hoveredErrorTaskId */
  onHoveredErrorTaskIdChange?: (taskId: string | null) => void;
}

const ERROR_ICON_CLASS =
  'relative inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 dark:bg-red-400 text-white flex-shrink-0 border border-white dark:border-gray-800 cursor-default pointer-events-auto transition-transform duration-150 hover:scale-125';

/**
 * Иконка ошибки планирования с тултипом.
 * Используется в шапке дней (DaysHeader/DaysRow) при наличии ошибок валидации.
 */
export function DayErrorIndicator({
  errorDetails,
  tasks,
  onHoveredErrorTaskIdChange,
}: DayErrorIndicatorProps) {
  // Создаем карту taskName -> taskId для быстрого поиска
  const taskNameToIdMap = useMemo(() => {
    if (!tasks) return new Map<string, string>();
    const map = new Map<string, string>();
    tasks.forEach((task) => {
      map.set(task.name, task.id);
    });
    return map;
  }, [tasks]);

  // Проверяем, есть ли ошибки пересечения по занятости
  const hasOverlapErrors = useMemo(() => {
    if (!errorDetails) return false;
    return errorDetails.some((detail) =>
      detail.reasons.some((reason) => reason.includes('Пересечение по занятости'))
    );
  }, [errorDetails]);

  const handleMouseEnter = () => {
    if (!hasOverlapErrors || !errorDetails || !tasks || !onHoveredErrorTaskIdChange) return;
    // Берем первую задачу с ошибкой пересечения
    const overlapError = errorDetails.find((detail) =>
      detail.reasons.some((reason) => reason.includes('Пересечение по занятости'))
    );
    if (overlapError) {
      const taskId = taskNameToIdMap.get(overlapError.taskName);
      if (taskId) {
        onHoveredErrorTaskIdChange(taskId);
      }
    }
  };

  const handleMouseLeave = () => {
    if (onHoveredErrorTaskIdChange) {
      onHoveredErrorTaskIdChange(null);
    }
  };

  return (
    <TextTooltip
      content={
        errorDetails?.length ? (
          <>
            <div className="font-semibold mb-1">Возможные риски:</div>
            <ul className="list-none space-y-1">
              {errorDetails.map(({ taskName, reasons }) => (
                <li key={taskName}>
                  <span className="font-medium">{taskName}</span>
                  <span className="text-gray-300 dark:text-gray-400"> — {reasons.join(', ')}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          'В этом дне есть ошибки планирования'
        )
      }
    >
      <span
        className={ERROR_ICON_CLASS}
        onMouseEnter={hasOverlapErrors ? handleMouseEnter : undefined}
        onMouseLeave={hasOverlapErrors ? handleMouseLeave : undefined}
      >
        <Icon className="w-2.5 h-2.5 shrink-0" name="exclamation" />
      </span>
    </TextTooltip>
  );
}
