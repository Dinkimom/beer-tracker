'use client';

import type { DayErrorDetail } from '@/features/sprint/utils/occupancyValidation';
import type { Task } from '@/types';

import { useMemo } from 'react';

import { Icon } from '@/components/Icon';
import { TextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';
import { translateOccupancyErrorReason } from '@/lib/planner-timeline/occupancyErrorMessages';

interface DayErrorIndicatorProps {
  /** Список проблемных задач и причин для тултипа */
  errorDetails?: DayErrorDetail[];
  /** Список задач для поиска taskId по taskName */
  tasks?: Task[];
  /** Callback для изменения hoveredErrorTaskId */
  onHoveredErrorTaskIdChange?: (taskId: string | null) => void;
}

const ERROR_ICON_CLASS =
  'relative inline-flex h-5 w-5 flex-shrink-0 cursor-default items-center justify-center rounded-md border border-red-300/90 bg-red-50 text-red-600 pointer-events-auto transition-transform duration-150 hover:scale-110 dark:border-gray-800 dark:bg-red-400 dark:text-white';

/**
 * Иконка ошибки планирования с тултипом.
 * Используется в шапке дней (DaysHeader/DaysRow) при наличии ошибок валидации.
 */
export function DayErrorIndicator({
  errorDetails,
  tasks,
  onHoveredErrorTaskIdChange,
}: DayErrorIndicatorProps) {
  const { t } = useI18n();

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
    return errorDetails.some((detail) => detail.reasons.includes('performer_overlap'));
  }, [errorDetails]);

  const handleMouseEnter = () => {
    if (!hasOverlapErrors || !errorDetails || !tasks || !onHoveredErrorTaskIdChange) return;
    // Берем первую задачу с ошибкой пересечения
    const overlapError = errorDetails.find((detail) =>
      detail.reasons.includes('performer_overlap')
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
            <div className="font-semibold mb-1">{t('task.occupancyRisks.possibleRisks')}</div>
            <ul className="list-none space-y-1">
              {errorDetails.map(({ taskName, reasons }) => (
                <li key={taskName}>
                  <span className="font-medium">{taskName}</span>
                  <span className="text-gray-300 dark:text-gray-400">
                    {' — '}
                    {reasons.map((reason) => translateOccupancyErrorReason(reason, t)).join(', ')}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          t('task.occupancyRisks.dayHasPlanningErrors')
        )
      }
    >
      <span
        className={ERROR_ICON_CLASS}
        onMouseEnter={hasOverlapErrors ? handleMouseEnter : undefined}
        onMouseLeave={hasOverlapErrors ? handleMouseLeave : undefined}
      >
        <Icon className="h-3 w-3 shrink-0" name="exclamation" />
      </span>
    </TextTooltip>
  );
}
