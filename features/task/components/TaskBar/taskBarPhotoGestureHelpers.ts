import { SWIMLANE_TASK_DRAG_ACTIVATION_DISTANCE_PX } from '@/features/swimlane/utils/swimlaneTaskDragActivation';

export function photoPointerExceededDragThreshold(
  start: { x: number; y: number },
  clientX: number,
  clientY: number
): boolean {
  const deltaX = Math.abs(clientX - start.x);
  const deltaY = Math.abs(clientY - start.y);
  return (
    deltaX >= SWIMLANE_TASK_DRAG_ACTIVATION_DISTANCE_PX ||
    deltaY >= SWIMLANE_TASK_DRAG_ACTIVATION_DISTANCE_PX
  );
}

export function shouldOpenPhotoLightboxAfterPointerUp(input: {
  clickStartPos: { x: number; y: number } | null;
  clientX: number;
  clientY: number;
  effectiveIsDragging: boolean;
  isResizing: boolean;
  suppressOpen: boolean;
  target: HTMLElement;
}): boolean {
  if (
    input.suppressOpen ||
    !input.clickStartPos ||
    input.effectiveIsDragging ||
    input.isResizing
  ) {
    return false;
  }
  if (input.target.closest('a')) {
    return false;
  }
  return !photoPointerExceededDragThreshold(input.clickStartPos, input.clientX, input.clientY);
}
