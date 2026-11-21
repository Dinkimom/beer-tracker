'use client';

import type { Task, TaskCardVariant, TaskPosition } from '@/types';

import { formatTaskTestPointsForDisplay } from '@/lib/pointsUtils';

import { useTaskCardBoard } from '../TaskCardBoardContext';
import { resolveTaskCardEstimateVisibility } from '../taskCardEstimateVisibility';
import { useTaskCardEstimateMapping } from '../useTaskCardEstimateMapping';

import {
  isSwimlaneTaskCardTagsVariant,
  resolveContainerClass,
  resolveTaskCardTagsLayout,
  resolveTaskCardTagsPoints,
} from './taskCardTagsHelpers';
import { TaskCardTagsSidebarRow } from './TaskCardTagsSidebarRow';

interface TaskCardTagsProps {
  displayDuration?: number;
  task: Task;
  taskPosition?: TaskPosition;
  variant?: TaskCardVariant;
}

export function TaskCardTags({
  task,
  taskPosition: _,
  variant = 'swimlane',
  displayDuration,
}: TaskCardTagsProps) {
  const estimateMapping = useTaskCardEstimateMapping();
  const board = useTaskCardBoard();

  // Канбан показывает статус, серьёзность и оценку слотами карточки.
  if (isSwimlaneTaskCardTagsVariant(variant) || board === 'kanban') {
    return null;
  }

  const { containerPadding, tagTextSize } = resolveTaskCardTagsLayout(variant, displayDuration);
  const { hideTestPoints, spText } = resolveTaskCardTagsPoints(task);
  const estimateVisibility = resolveTaskCardEstimateVisibility({
    hideTestPoints,
    isQATask: false,
    mapping: estimateMapping,
    showEstimatesSetting: true,
    taskId: task.id,
  });
  const tpText = formatTaskTestPointsForDisplay(task, 'compact');
  const containerClass = resolveContainerClass(containerPadding);

  return (
    <div className={containerClass} data-task-card-tags="">
      <TaskCardTagsSidebarRow
        hideTestPoints={hideTestPoints}
        showStoryPoints={estimateVisibility.showStoryPoints}
        showTestPoints={estimateVisibility.showTestPoints}
        spText={spText}
        tagTextSize={tagTextSize}
        task={task}
        tpText={tpText}
      />
    </div>
  );
}
