import type { PlannerImageCropHandle } from '@/features/task/utils/cropPlannerImage';

export const PLANNER_IMAGE_CROP_HANDLES: Exclude<PlannerImageCropHandle, 'move'>[] = [
  'e',
  'n',
  'ne',
  'nw',
  's',
  'se',
  'sw',
  'w',
];

const HANDLE_POSITION_CLASS: Record<Exclude<PlannerImageCropHandle, 'move'>, string> = {
  e: 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2',
  n: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2',
  ne: 'top-0 right-0 translate-x-1/2 -translate-y-1/2',
  nw: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2',
  s: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2',
  se: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2',
  sw: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2',
  w: 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2',
};

const HANDLE_CURSOR_CLASS: Record<PlannerImageCropHandle, string> = {
  e: 'cursor-ew-resize',
  move: 'cursor-move',
  n: 'cursor-ns-resize',
  ne: 'cursor-nesw-resize',
  nw: 'cursor-nwse-resize',
  s: 'cursor-ns-resize',
  se: 'cursor-nwse-resize',
  sw: 'cursor-nesw-resize',
  w: 'cursor-ew-resize',
};

export function plannerImageCropHandleClass(
  handle: Exclude<PlannerImageCropHandle, 'move'>
): string {
  return `absolute h-3 w-3 rounded-[2px] border border-white bg-blue-500 shadow-sm ${HANDLE_CURSOR_CLASS[handle]} ${HANDLE_POSITION_CLASS[handle]}`;
}

export function plannerImageCropMoveClass(): string {
  return HANDLE_CURSOR_CLASS.move;
}
