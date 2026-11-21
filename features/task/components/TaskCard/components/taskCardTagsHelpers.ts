import type { Task, TaskCardVariant } from '@/types';

import { ZIndex } from '@/constants';
import { formatTaskStoryPointsForDisplay } from '@/lib/pointsUtils';

function tagTextSizeClass(isVeryNarrow: boolean, isNarrow: boolean): string {
  if (isVeryNarrow) return 'text-[8px]';
  if (isNarrow) return 'text-[9px]';
  return 'text-[11px]';
}

export function resolveContainerClass(containerPadding: string): string {
  return `absolute ${containerPadding} flex min-w-0 flex-col gap-1.5 overflow-hidden ${ZIndex.class('stickyElevated')} pointer-events-none`;
}

export function resolveTaskCardTagsLayout(variant: TaskCardVariant, displayDuration?: number) {
  const isSwimlane = variant === 'swimlane';
  const isVeryNarrow = isSwimlane && displayDuration !== undefined && displayDuration < 3;
  const isNarrow = isSwimlane && displayDuration !== undefined && displayDuration < 4;
  return {
    containerPadding: isVeryNarrow ? 'left-1 right-1 bottom-1' : 'left-1.5 right-1.5 bottom-1.5',
    isNarrow,
    isVeryNarrow,
    tagTextSize: tagTextSizeClass(isVeryNarrow, isNarrow),
  };
}

export function resolveTaskCardTagsPoints(task: Task) {
  return {
    hideTestPoints: task.hideTestPointsByIntegration === true,
    spText: formatTaskStoryPointsForDisplay(task, 'compact'),
  };
}

export function isSwimlaneTaskCardTagsVariant(variant: TaskCardVariant): boolean {
  return variant === 'swimlane';
}
