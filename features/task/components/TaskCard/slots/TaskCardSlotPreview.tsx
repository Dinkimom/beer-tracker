'use client';

import type { TaskCardSlotItemContext } from './taskCardSlotItemContext';
import type { TaskCardDensity, TaskCardSlotLayout } from '@/lib/taskCard/taskCardSlots';
import type { Task } from '@/types';

import { useI18n } from '@/contexts/LanguageContext';
import { formatTaskStoryPointsForDisplay } from '@/lib/pointsUtils';

import { getTaskCardStyles } from '../components/taskCardBodyStyleHelpers';

import { resolveSwimlaneTaskCardSlots } from './resolveSwimlaneTaskCardSlots';
import { TASK_CARD_SLOT_ASSIGNEE } from './taskCardSlotFixtures';
import { TaskCardSlotItems } from './TaskCardSlotItems';
import { taskCardDensityLabel } from './taskCardSlotLabels';

const DENSITY_DURATION: Record<TaskCardDensity, number> = {
  compact: 1,
  narrow: 2,
  regular: 4,
};

const DENSITY_WIDTH: Record<TaskCardDensity, number> = {
  compact: 96,
  narrow: 168,
  regular: 280,
};

interface TaskCardSlotPreviewProps {
  caption?: string;
  density?: TaskCardDensity;
  layout: TaskCardSlotLayout;
  task: Task;
  width?: number;
}

export function TaskCardSlotPreview({
  caption,
  density = 'regular',
  layout,
  task,
  width,
}: TaskCardSlotPreviewProps) {
  const { t } = useI18n();
  const displayDuration = DENSITY_DURATION[density];
  const resolved = resolveSwimlaneTaskCardSlots({
    displayDuration,
    hasAssignee: true,
    hasEstimate: task.storyPoints != null,
    hasKey: true,
    hideParent: false,
    layout,
    task,
  });
  const styles = getTaskCardStyles(task, 'swimlane', 'status');
  const parentLabel = task.parent?.display || task.parent?.key || '';
  const context: TaskCardSlotItemContext = {
    assignee: TASK_CARD_SLOT_ASSIGNEE,
    estimateLabel: formatTaskStoryPointsForDisplay(task, 'compact'),
    parentLabel,
  };
  const cardWidth = width ?? DENSITY_WIDTH[density];

  return (
    <figure className="m-0 space-y-1">
      <div
        className={`flex min-h-[92px] flex-col gap-1 overflow-hidden rounded-lg border px-2.5 py-1.5 text-gray-900 dark:text-gray-100 ${styles.teamColor} ${styles.teamBorder}`}
        data-task-card-preview=""
        data-task-card-preview-density={density}
        style={{ width: cardWidth }}
      >
        <TaskCardSlotItems context={context} items={resolved.eyebrow} task={task} />
        <div className="min-h-0 flex-1 text-[12px] leading-tight">
          <TaskCardSlotItems context={context} flow="inline" items={resolved.titleLead} task={task} />
          {resolved.titleLead.length > 0 ? ' ' : null}
          <span className="font-bold">{task.name}</span>
        </div>
        {resolved.footer.length > 0 || resolved.footerEnd.length > 0 ? (
          <div className="flex min-w-0 shrink-0 items-center gap-1.5">
            <TaskCardSlotItems context={context} items={resolved.footer} task={task} />
            <TaskCardSlotItems alignEnd context={context} items={resolved.footerEnd} task={task} />
          </div>
        ) : null}
      </div>
      <figcaption className="text-[10px] text-gray-500 dark:text-gray-400">
        {caption ?? taskCardDensityLabel(density, t)}
      </figcaption>
    </figure>
  );
}
