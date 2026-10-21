'use client';

import { TextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';
import { TASK_BAR_CORNER_BADGE_CLASS } from '@/features/task/components/TaskBar/TaskBarCornerRail';

interface TaskCardSwimlaneSegmentBadgeProps {
  interactionDisabled?: boolean;
  swimlaneSegmentBadge: { index: number; total: number };
}

/** Corner thumbnail badge for multi-segment swimlane plan bars (positioned by TaskBarCornerBadges). */
export function TaskCardSwimlaneSegmentBadge({
  swimlaneSegmentBadge,
  interactionDisabled = false,
}: TaskCardSwimlaneSegmentBadgeProps) {
  const { t } = useI18n();
  return (
    <TextTooltip
        content={t('task.card.segmentTooltip', {
          index: swimlaneSegmentBadge.index,
          total: swimlaneSegmentBadge.total,
        })}
      >
        <span
          className={`${TASK_BAR_CORNER_BADGE_CLASS} border-black bg-gray-900 text-white dark:border-gray-700 dark:bg-gray-800 ${
            interactionDisabled ? 'pointer-events-none' : 'pointer-events-auto'
          }`}
        >
          {swimlaneSegmentBadge.index}/{swimlaneSegmentBadge.total}
        </span>
    </TextTooltip>
  );
}
