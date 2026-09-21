'use client';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

export function QuarterlyPlannerDragHandle({
  dragHandle,
}: {
  dragHandle: { attributes: object; listeners: object | undefined };
}) {
  const { t } = useI18n();
  return (
    <div
      {...dragHandle.attributes}
      {...dragHandle.listeners}
      className="cursor-grab active:cursor-grabbing flex-shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      title={t('sprintPlanner.occupancy.dragToReorder')}
      onClick={(e) => e.stopPropagation()}
    >
      <Icon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" name="grip-vertical" />
    </div>
  );
}
