import type { SprintTimerStatus } from '@/lib/realtime/sprintTimerState';

import { OVERLAY_FLOATING_ANIMATION } from '@/components/overlayAnimationClasses';

const TRIGGER_BASE =
  'inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg tabular-nums text-sm font-medium outline-none transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40';

const GLASS_TRIGGER_HOVER =
  'hover:bg-black/10 active:bg-black/[0.16] dark:hover:bg-white/10 dark:active:bg-white/[0.16]';

export function isSprintPlannerTimerActiveStatus(status: SprintTimerStatus): boolean {
  return status === 'running' || status === 'paused';
}

export function sprintPlannerTimerTriggerClassName(
  status: SprintTimerStatus,
  popoverOpen: boolean,
  surface: 'glass' | 'solid' = 'solid'
): string {
  const active = isSprintPlannerTimerActiveStatus(status);
  const frame = 'border-0';
  const openBackdrop =
    surface === 'glass'
      ? 'bg-black/10 text-gray-800 dark:bg-white/10 dark:text-gray-100'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-700/80 dark:text-gray-100';
  const activeHover =
    surface === 'glass'
      ? GLASS_TRIGGER_HOVER
      : 'hover:bg-gray-100 active:bg-gray-200 dark:hover:bg-gray-700/70 dark:active:bg-gray-600';
  const idleHover =
    surface === 'glass'
      ? GLASS_TRIGGER_HOVER
      : 'hover:bg-gray-100 active:bg-gray-200 dark:hover:bg-gray-700/60 dark:active:bg-gray-600';

  if (popoverOpen) {
    if (active) {
      return `${TRIGGER_BASE} ${frame} px-2.5 ${openBackdrop}`;
    }
    return `${TRIGGER_BASE} ${frame} w-8 text-gray-700 ${openBackdrop} dark:text-gray-200`;
  }
  if (active) {
    return `${TRIGGER_BASE} ${frame} px-2.5 text-gray-800 ${activeHover} dark:text-gray-100`;
  }
  return `${TRIGGER_BASE} ${frame} w-8 text-gray-500 ${idleHover} hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200`;
}

export const SPRINT_PLANNER_TIMER_POPOVER_CLASS =
  `z-[300] w-52 rounded-2xl border border-gray-200/80 bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.12)] outline-none dark:border-gray-600/70 dark:bg-gray-900 dark:shadow-[0_8px_32px_rgba(0,0,0,0.45)] ${OVERLAY_FLOATING_ANIMATION}`;

export const SPRINT_PLANNER_TIMER_CLOCK_PANEL_CLASS =
  'mb-3 rounded-xl bg-gray-100 px-2 py-3 text-gray-900 dark:bg-gray-800 dark:text-gray-50';

export const SPRINT_PLANNER_TIMER_ACTION_BUTTON_CLASS =
  'inline-flex h-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-gray-100 text-gray-700 transition-all duration-200 hover:bg-gray-200 active:scale-[0.98] active:bg-gray-300 disabled:pointer-events-none disabled:opacity-40 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:active:bg-gray-500';

export const SPRINT_PLANNER_TIMER_ADD_MINUTE_BUTTON_CLASS =
  'inline-flex h-9 shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50 active:scale-[0.98] active:bg-gray-100 disabled:pointer-events-none disabled:opacity-40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:active:bg-gray-600';
