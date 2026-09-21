'use client';

import { TextTooltip } from '@/components/TextTooltip';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';

interface TaskCardSwimlaneSegmentBadgeProps {
  interactionDisabled?: boolean;
  swimlaneSegmentBadge: { index: number; total: number };
}

/** Corner thumbnail badge for multi-segment swimlane plan bars. */
export function TaskCardSwimlaneSegmentBadge({
  swimlaneSegmentBadge,
  interactionDisabled = false,
}: TaskCardSwimlaneSegmentBadgeProps) {
  const { t } = useI18n();
  return (
    <span
      className="absolute -left-2 -top-2"
      style={{ zIndex: ZIndex.value('dropdown') }}
    >
      <TextTooltip
        content={t('task.card.segmentTooltip', {
          index: swimlaneSegmentBadge.index,
          total: swimlaneSegmentBadge.total,
        })}
      >
        <span
          className={`task-card-swimlane-corner-badge inline-flex min-h-[18px] min-w-[18px] shrink-0 cursor-default items-center justify-center rounded-md border-2 border-black bg-gray-900 px-1 py-0.5 text-[9px] font-semibold tabular-nums leading-none text-white shadow-md hover:scale-125 dark:border-gray-700 dark:bg-gray-800 ${
            interactionDisabled ? 'pointer-events-none' : 'pointer-events-auto'
          }`}
        >
          {swimlaneSegmentBadge.index}/{swimlaneSegmentBadge.total}
        </span>
      </TextTooltip>
    </span>
  );
}
