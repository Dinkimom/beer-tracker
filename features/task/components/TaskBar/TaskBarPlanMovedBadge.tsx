'use client';

import { Icon } from '@/components/Icon';
import { TextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';

import { TASK_BAR_CORNER_BADGE_CLASS } from './TaskBarCornerRail';

interface TaskBarPlanMovedBadgeProps {
  direction: 'earlier' | 'later';
  interactionDisabled: boolean;
}

/** Угловой значок: задачу перенесли относительно плана на старте работы. */
export function TaskBarPlanMovedBadge({ direction, interactionDisabled }: TaskBarPlanMovedBadgeProps) {
  const { t } = useI18n();
  const later = direction === 'later';
  return (
    <TextTooltip
      content={t(
        later
          ? 'sprintPlanner.swimlane.planAnchorMovedLater'
          : 'sprintPlanner.swimlane.planAnchorMovedEarlier'
      )}
    >
      <span
        className={`${TASK_BAR_CORNER_BADGE_CLASS} !px-0 ${
          later
            ? 'border-amber-300/90 bg-amber-50 text-amber-700 dark:border-gray-800 dark:bg-amber-500 dark:text-white'
            : 'border-ds-border-subtle bg-ds-canvas text-ds-text-muted'
        } ${interactionDisabled ? 'pointer-events-none' : 'pointer-events-auto'}`}
      >
        <Icon className="h-2.5 w-2.5" name={later ? 'arrow-right' : 'arrow-left'} />
      </span>
    </TextTooltip>
  );
}
