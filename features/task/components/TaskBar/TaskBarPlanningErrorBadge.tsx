'use client';

import { Icon } from '@/components/Icon';
import { TextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';

import { TASK_BAR_CORNER_BADGE_CLASS } from './TaskBarCornerRail';

interface TaskBarPlanningErrorBadgeProps {
  errorTooltip?: string;
  interactionDisabled: boolean;
}

/** Предупреждение о наложении / ошибке планирования — первым в левой рейке. */
export function TaskBarPlanningErrorBadge({
  errorTooltip,
  interactionDisabled,
}: TaskBarPlanningErrorBadgeProps) {
  const { t } = useI18n();
  return (
    <TextTooltip content={errorTooltip || t('task.taskBar.planningError')}>
      <span
        className={`${TASK_BAR_CORNER_BADGE_CLASS} !px-0 border-red-300/90 bg-red-50 text-red-600 dark:border-gray-800 dark:bg-red-400 dark:text-white ${
          interactionDisabled ? 'pointer-events-none' : 'pointer-events-auto'
        }`}
      >
        <Icon className="h-3 w-3 shrink-0" name="exclamation" />
      </span>
    </TextTooltip>
  );
}
