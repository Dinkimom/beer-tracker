'use client';

import type { TaskCardDensity, TaskCardSlotLayout } from '@/lib/taskCard/taskCardSlots';
import type { Task } from '@/types';

import { useI18n } from '@/contexts/LanguageContext';
import { TASK_CARD_DENSITIES } from '@/lib/taskCard/taskCardSlots';

import { taskCardSlotSampleInProgress } from './taskCardSlotFixtures';
import { TaskCardSlotPreview } from './TaskCardSlotPreview';

interface TaskCardSlotPreviewGalleryProps {
  layout: TaskCardSlotLayout;
  sample?: { fieldId: string; value: string } | null;
}

export function TaskCardSlotPreviewGallery({ layout, sample = null }: TaskCardSlotPreviewGalleryProps) {
  const { t } = useI18n();
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {t('settings.planningTab.cardSlots.previewWidths')}
      </h3>
      <div className="flex flex-wrap items-start gap-4">
        {TASK_CARD_DENSITIES.map((density) => (
          <TaskCardSlotPreview
            key={density}
            density={density}
            layout={layout}
            task={previewTask(density, sample)}
          />
        ))}
      </div>
    </section>
  );
}

function previewTask(density: TaskCardDensity, sample: { fieldId: string; value: string } | null): Task {
  if (density !== 'regular' || !sample) {
    return taskCardSlotSampleInProgress;
  }
  return {
    ...taskCardSlotSampleInProgress,
    customFieldValues: {
      ...taskCardSlotSampleInProgress.customFieldValues,
      [sample.fieldId]: sample.value,
    },
  };
}
