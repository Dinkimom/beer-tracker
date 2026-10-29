'use client';

import type { TaskCardDensity, TaskCardSlotLayout } from '@/lib/taskCard/taskCardSlots';
import type { Task } from '@/types';

import { useI18n } from '@/contexts/LanguageContext';
import { TASK_CARD_DENSITIES } from '@/lib/taskCard/taskCardSlots';

import { TASK_CARD_SLOT_SAMPLE_USERS, taskCardSlotSampleInProgress } from './taskCardSlotFixtures';
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
            task={previewTask(density, sample, layout)}
          />
        ))}
      </div>
    </section>
  );
}

function previewTask(
  density: TaskCardDensity,
  sample: { fieldId: string; value: string } | null,
  layout: TaskCardSlotLayout
): Task {
  const task = withSampleUsers(taskCardSlotSampleInProgress, layout);
  if (density !== 'regular' || !sample) {
    return task;
  }
  return {
    ...task,
    customFieldValues: {
      ...task.customFieldValues,
      [sample.fieldId]: sample.value,
    },
  };
}

/** Полю в виде «Аватары» в превью — образцовые люди, чтобы вид было видно. */
function withSampleUsers(task: Task, layout: TaskCardSlotLayout): Task {
  const avatarFields = layout.customPlacements.filter((placement) => placement.presentation === 'avatars');
  if (avatarFields.length === 0) {
    return task;
  }
  const names = TASK_CARD_SLOT_SAMPLE_USERS.map((user) => user.name).join(', ');
  const customFieldValues = { ...task.customFieldValues };
  const customFieldUsers = { ...task.customFieldUsers };
  for (const placement of avatarFields) {
    customFieldValues[placement.fieldId] = names;
    customFieldUsers[placement.fieldId] = TASK_CARD_SLOT_SAMPLE_USERS;
  }
  return { ...task, customFieldUsers, customFieldValues };
}
