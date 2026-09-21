import type { Task } from '@/types';

import { useCallback } from 'react';

import { isSwimlaneImageTask } from '@/features/task/utils/swimlaneImageTask';
import { useRootStore } from '@/lib/layers';

import { usePhotoCardDragClickGuard } from './usePhotoCardDragClickGuard';

export function useTaskBarPhotoCardInteractions(task: Task, effectiveIsDragging: boolean) {
  const { sprintPlannerUi } = useRootStore();
  const isPhotoCard = isSwimlaneImageTask(task);
  const photoClickGuard = usePhotoCardDragClickGuard(isPhotoCard, effectiveIsDragging);
  const openPhotoLightbox = useCallback(
    () => sprintPlannerUi.openPhotoLightbox(task.id),
    [sprintPlannerUi, task.id]
  );
  const getPhotoClickSuppress = isPhotoCard
    ? () => photoClickGuard.suppressOpenRef.current
    : undefined;
  const beginPhotoGesture = isPhotoCard ? photoClickGuard.beginGesture : undefined;

  return {
    beginPhotoGesture,
    getPhotoClickSuppress,
    isPhotoCard,
    openPhotoLightbox,
  };
}
